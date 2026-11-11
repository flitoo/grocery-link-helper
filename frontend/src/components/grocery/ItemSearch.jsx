import { useEffect, useState } from "react";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import {
  displayBrand,
  formatUnitPrice,
  parseQuantity,
  quantityStep,
} from "../../utils/groceryList";
import "./ItemSearch.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

const PAGE_SIZE = 20;

async function fetchJson(path, signal) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.errors?.[0] || "Could not load items.");
  }
  return data;
}

function buildSearchPath({ storeId, query, category, tags, offset }) {
  const params = new URLSearchParams({ store_id: String(storeId) });
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  tags.forEach((tag) => params.append("tag", tag));
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(offset));
  return `/api/items?${params.toString()}`;
}

function friendlyError(err) {
  return err instanceof TypeError
    ? "Could not reach the server. Check that it is running, then try again."
    : err.message || "Could not load items.";
}

// One search result with its own quantity box and Add button.
function ResultRow({ item, onAdd }) {
  const [quantity, setQuantity] = useState("1");
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const brand = displayBrand(item.brand);
  const weighed = item.unit !== "each";

  function handleAdd() {
    const parsed = parseQuantity(quantity, item.unit);
    if (parsed.error) {
      setFeedback({ type: "error", text: parsed.error });
      return;
    }
    const result = onAdd(item, parsed.quantity);
    setFeedback(
      result.error
        ? { type: "error", text: result.error }
        : { type: "ok", text: result.merged ? "Quantity updated" : "Added" }
    );
  }

  return (
    <li className="search-result">
      <div className="search-result-info">
        <h3>{item.name}</h3>
        <p className="search-result-meta">
          {[brand, item.category].filter(Boolean).join(" · ")}
        </p>
        {item.dietary_tags.length > 0 && (
          <ul className="search-result-tags" aria-label="Dietary tags">
            {item.dietary_tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="search-result-buy">
        <strong className="search-result-price">
          {formatUnitPrice({ estimatedPrice: item.unit_price, unit: item.unit })}
        </strong>

        <div className="search-result-controls">
          <label>
            <span className="visually-hidden">
              Quantity of {item.name} in {weighed ? item.unit : "pieces"}
            </span>
            <input
              type="number"
              inputMode={weighed ? "decimal" : "numeric"}
              min={quantityStep(item.unit)}
              step={quantityStep(item.unit)}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setFeedback({ type: "", text: "" });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
          </label>
          <span className="search-result-unit">{weighed ? item.unit : "pcs"}</span>
          <button type="button" onClick={handleAdd}>
            Add
          </button>
        </div>

        {feedback.text && (
          <p
            className={`search-result-feedback ${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Search box, category and dietary filters, and the matching items of one
 * store. `onAdd(catalogItem, quantity)` returns { error } or { merged }.
 */
function ItemSearch({ storeId, onAdd }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ categories: [], dietary_tags: [] });

  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const requestKey = JSON.stringify([storeId, debouncedQuery, category, tags]);

  // `result.key` says which search the results belong to, so "loading" is
  // simply "the results are for an older search".
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: "" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchJson("/api/items/filters", controller.signal)
      .then((data) =>
        setFilterOptions({
          categories: data.categories || [],
          dietary_tags: data.dietary_tags || [],
        })
      )
      .catch(() => {
        // Searching still works without the filter lists.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const path = buildSearchPath({ storeId, query: debouncedQuery, category, tags, offset: 0 });

    fetchJson(path, controller.signal)
      .then((data) =>
        setResult({ key: requestKey, items: data.items, total: data.total, error: "" })
      )
      .catch((err) => {
        if (err.name === "AbortError") return;
        setResult({ key: requestKey, items: [], total: 0, error: friendlyError(err) });
      });

    return () => controller.abort();
  }, [requestKey, storeId, debouncedQuery, category, tags]);

  const loading = result.key !== requestKey;
  const hasFilters = Boolean(query || category || tags.length);

  function toggleTag(tag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  function clearFilters() {
    setQuery("");
    setCategory("");
    setTags([]);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    setMoreError("");
    try {
      const data = await fetchJson(
        buildSearchPath({
          storeId,
          query: debouncedQuery,
          category,
          tags,
          offset: result.items.length,
        })
      );
      setResult((current) =>
        current.key === requestKey
          ? { ...current, items: [...current.items, ...data.items], total: data.total }
          : current
      );
    } catch (err) {
      setMoreError(friendlyError(err));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="item-search" aria-label="Find items">
      <div className="item-search-bar">
        <label className="item-search-input">
          <span className="visually-hidden">Search items by name or brand</span>
          <input
            type="search"
            placeholder="Search items or brands, e.g. milk, Neilson"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <label className="item-search-category">
          <span className="visually-hidden">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {filterOptions.categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filterOptions.dietary_tags.length > 0 && (
        <div className="item-search-tags" role="group" aria-label="Dietary filters">
          {filterOptions.dietary_tags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={tags.includes(tag) ? "tag-chip active" : "tag-chip"}
              aria-pressed={tags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="item-search-status" aria-live="polite">
        {loading && <p>Searching…</p>}
        {!loading && !result.error && (
          <p>
            {result.total === 0
              ? "No items found."
              : `${result.total} ${result.total === 1 ? "item" : "items"}`}
            {hasFilters && result.total > 0 && (
              <button type="button" className="link-button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </p>
        )}
      </div>

      {result.error && !loading && (
        <p className="item-search-error" role="alert">
          {result.error}
        </p>
      )}

      {!loading && !result.error && result.total === 0 && (
        <div className="item-search-empty">
          <p>
            {hasFilters
              ? "Nothing matches your search. Try fewer filters or a different word."
              : "This store has no items yet."}
          </p>
          {hasFilters && (
            <button type="button" className="link-button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
          <p>You can still add anything below as a custom item.</p>
        </div>
      )}

      {result.items.length > 0 && (
        <ul className={loading ? "search-results stale" : "search-results"}>
          {result.items.map((item) => (
            <ResultRow key={item.item_id} item={item} onAdd={onAdd} />
          ))}
        </ul>
      )}

      {!loading && result.items.length < result.total && (
        <div className="item-search-more">
          <button type="button" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore
              ? "Loading…"
              : `Show more (${result.total - result.items.length} left)`}
          </button>
          {moreError && (
            <p className="item-search-error" role="alert">
              {moreError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default ItemSearch;

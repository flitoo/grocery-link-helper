
const collectionsModel = require("../models/collections.model");
const { parseId } = require('../validators/ids.validator');

function validId(value) {
  return parseId(value);
}

function validateCollection(body) {
  const name = body.name;
  const description = body.description ?? "";
  const category = body.category ?? null;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100
  ) {
    return { error: "Collection name must be 1-100 characters." };
  }

  if (typeof description !== "string") {
    return { error: "Description must be text." };
  }

  if (
    category !== null &&
    (typeof category !== "string" || category.length > 60)
  ) {
    return { error: "Category must be 60 characters or fewer." };
  }

  return {
    data: {
      name: name.trim(),
      description: description.trim(),
      category: category?.trim() || null,
    },
  };
}

function validateItem(body) {
  const itemName = body.item_name;
  const brand = body.brand ?? null;
  const quantity = body.quantity ?? 1;
  const unit = body.unit ?? "pcs";
  const price = body.estimated_unit_price ?? null;
  const dietary = body.dietary_options ?? [];

  if (
    typeof itemName !== "string" ||
    !itemName.trim() ||
    itemName.trim().length > 150
  ) {
    return { error: "Item name must be 1-150 characters." };
  }

  if (
    brand !== null &&
    (typeof brand !== "string" || brand.length > 100)
  ) {
    return { error: "Brand must be 100 characters or fewer." };
  }

  const parsedQuantity = Number(quantity);

  if (
    !['number', 'string'].includes(typeof quantity) ||
    !Number.isFinite(parsedQuantity) ||
    parsedQuantity <= 0 ||
    parsedQuantity > 99999999 ||
    Math.abs(parsedQuantity * 100 - Math.round(parsedQuantity * 100)) > 0.000001
  ) {
    return { error: "Quantity must be a positive number with at most 2 decimal places." };
  }

  if (
    typeof unit !== "string" ||
    !unit.trim() ||
    unit.trim().length > 20
  ) {
    return { error: "Unit must be 1-20 characters." };
  }

  const parsedPrice = price === null ? null : Number(price);

  if (
    price !== null &&
    (
      !['number', 'string'].includes(typeof price) ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0 ||
      parsedPrice > 99999999 ||
      (typeof price === 'string' && !price.trim()) ||
      Math.abs(parsedPrice * 100 - Math.round(parsedPrice * 100)) > 0.000001
    )
  ) {
    return { error: "Price must be a valid non-negative number with at most 2 decimal places." };
  }

  if (
    !Array.isArray(dietary) ||
    dietary.length > 20 ||
    !dietary.every(
      (option) =>
        typeof option === "string" &&
        option.trim().length > 0 &&
        option.trim().length <= 60
    )
  ) {
    return { error: "Dietary options must be an array of valid text values." };
  }

  return {
    data: {
      item_name: itemName.trim(),
      brand: brand?.trim() || null,
      quantity: parsedQuantity,
      unit: unit.trim(),
      estimated_unit_price: parsedPrice,
      dietary_options: dietary.map((option) => option.trim()),
    },
  };
}

function handleError(res, error) {
  console.error("Collections API error:", error);

  return res.status(500).json({
    error: "An unexpected server error occurred.",
  });
}

// GET /api/collections
async function listCollections(req, res) {
  try {
    const customerId = req.user.userId;

    const collections =
      await collectionsModel.getCollections(customerId);

    return res.json({ collections });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /api/collections/:id
async function getCollection(req, res) {
  try {
    const collectionId = validId(req.params.id);

    if (!collectionId) {
      return res.status(400).json({
        error: "Invalid collection ID.",
      });
    }

    const customerId = req.user.userId;

    const collection = await collectionsModel.getCollection(
      collectionId,
      customerId
    );

    if (!collection) {
      return res.status(404).json({
        error: "Collection not found.",
      });
    }

    const items = await collectionsModel.getCollectionItems(
      collectionId
    );

    return res.json({
      collection: {
        ...collection,
        items,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// POST /api/collections
async function createCollection(req, res) {
  try {
    const validation = validateCollection(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const collection = await collectionsModel.createCollection(
      req.user.userId,
      validation.data
    );

    return res.status(201).json({ collection });
  } catch (error) {
    return handleError(res, error);
  }
}

// PUT /api/collections/:id
async function updateCollection(req, res) {
  try {
    const collectionId = validId(req.params.id);

    if (!collectionId) {
      return res.status(400).json({
        error: "Invalid collection ID.",
      });
    }

    const validation = validateCollection(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const collection = await collectionsModel.updateCollection(
      collectionId,
      req.user.userId,
      validation.data
    );

    if (!collection) {
      return res.status(404).json({
        error: "Collection not found.",
      });
    }

    return res.json({ collection });
  } catch (error) {
    return handleError(res, error);
  }
}

// DELETE /api/collections/:id
async function deleteCollection(req, res) {
  try {
    const collectionId = validId(req.params.id);

    if (!collectionId) {
      return res.status(400).json({
        error: "Invalid collection ID.",
      });
    }

    const deleted = await collectionsModel.deleteCollection(
      collectionId,
      req.user.userId
    );

    if (!deleted) {
      return res.status(404).json({
        error: "Collection not found.",
      });
    }

    return res.json({
      message: "Collection deleted successfully.",
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// POST /api/collections/:id/items
async function addCollectionItem(req, res) {
  try {
    const collectionId = validId(req.params.id);

    if (!collectionId) {
      return res.status(400).json({
        error: "Invalid collection ID.",
      });
    }

    const validation = validateItem(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const item = await collectionsModel.addCollectionItem(
      collectionId,
      req.user.userId,
      validation.data
    );

    if (!item) {
      return res.status(404).json({
        error: "Collection not found.",
      });
    }

    return res.status(201).json({ item });
  } catch (error) {
    return handleError(res, error);
  }
}

// DELETE /api/collections/:id/items/:itemId
async function deleteCollectionItem(req, res) {
  try {
    const collectionId = validId(req.params.id);
    const itemId = validId(req.params.itemId);

    if (!collectionId || !itemId) {
      return res.status(400).json({
        error: "Invalid collection or item ID.",
      });
    }

    const deleted = await collectionsModel.deleteCollectionItem(
      collectionId,
      req.user.userId,
      itemId
    );

    if (!deleted) {
      return res.status(404).json({
        error: "Collection item not found.",
      });
    }

    return res.json({
      message: "Item removed successfully.",
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  addCollectionItem,
  deleteCollectionItem,
};

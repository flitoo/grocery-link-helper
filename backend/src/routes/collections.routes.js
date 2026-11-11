
const express = require("express");

const {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  addCollectionItem,
  deleteCollectionItem,
} = require("../controllers/collections.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// All collections endpoints require login
router.use(requireAuth);

// List all collections
router.get("/", listCollections);

// Create a new collection
router.post("/", createCollection);

// Get collection details
router.get("/:id", getCollection);

// Update collection
router.put("/:id", updateCollection);

// Delete collection
router.delete("/:id", deleteCollection);

// Add an item to a collection
router.post("/:id/items", addCollectionItem);

// Remove an item from a collection
router.delete("/:id/items/:itemId", deleteCollectionItem);

module.exports = router;

/**
 * Relation schema registration — runs once at app init via side-effect import.
 *
 * Enables cascadeInvalidation: when a Review is created, the parent Product's
 * review list is automatically marked stale. When a Product's maintainerId
 * changes, the old and new Maintainer entities are invalidated.
 */
import { registerSchema } from "prometheus-entity-management";

registerSchema({
  type: "Product",
  relations: {
    reviews: {
      cardinality: "hasMany",
      targetType: "Review",
      foreignKey: "productId",
      listKeyPrefix: (parentId) => ["reviews", { productId: parentId }],
    },
    maintainer: {
      cardinality: "belongsTo",
      foreignKey: "maintainerId",
      targetType: "Maintainer",
    },
  },
  globalListKeys: ["products"],
});

registerSchema({
  type: "Maintainer",
  relations: {
    products: {
      cardinality: "hasMany",
      targetType: "Product",
      foreignKey: "maintainerId",
      listKeyPrefix: (parentId) => ["products", { maintainerId: parentId }],
    },
  },
});

registerSchema({
  type: "Review",
  relations: {
    product: {
      cardinality: "belongsTo",
      foreignKey: "productId",
      targetType: "Product",
    },
  },
  globalListKeys: ["reviews"],
});

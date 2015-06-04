import Bucket from "./bucket";

var BelongsToBucket = function(name, store, record, inverseKey, relationshipMeta, relationship) {
  this._super$constructor(name, store,  record, inverseKey, relationshipMeta, relationship);
  this.state = null;
};

BelongsToBucket.prototype = Ember.create(Bucket.prototype);
BelongsToBucket.prototype.constructor = BelongsToBucket;
BelongsToBucket.prototype._super$constructor = Bucket;

BelongsToBucket.prototype._super$add = Bucket.prototype.add;
BelongsToBucket.prototype.add = function(newRecord) {
  if (this.members.has(newRecord)) { return; }

  if (this.state) {
    this.remove(this.state);
  }

  this.state = newRecord;
  this._super$add(newRecord);
};

BelongsToBucket.prototype._super$removeFromOwn = Bucket.prototype.removeFromOwn;
BelongsToBucket.prototype.removeFromOwn = function(record) {
  if (!this.members.has(record)) { return;}
  this.state = null;
  this._super$removeFromOwn(record);
};

export default BelongsToBucket;

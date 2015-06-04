import Bucket from "./bucket";

var HasManyBucket = function(name, store, record, inverseKey, relationshipMeta, relationship) {
  this._super$constructor(name, store, record, inverseKey, relationshipMeta, relationship);
  this.stateArray = [];
};

HasManyBucket.prototype = Ember.create(Bucket.prototype);
HasManyBucket.prototype.constructor = HasManyBucket;
HasManyBucket.prototype._super$constructor = Bucket;

HasManyBucket.prototype._super$add = Bucket.prototype.add;
HasManyBucket.prototype.add = function(record, idx) {
  if (this.members.has(record)) {
    return;
  }
  if (idx !== undefined) {
    this.stateArray.splice(idx, 0, record);
  } else {
    this.stateArray.push(record);
  }
  this._super$add(record, idx);
};

HasManyBucket.prototype._super$removeFromOwn = HasManyBucket.prototype.removeFromOwn;
HasManyBucket.prototype.removeFromOwn = function(record, idx) {
  var i = idx;
  if (!this.members.has(record)) {
    return;
  }
  if (i === undefined) {
    i = this.stateArray.indexOf(record);
  }
  if (i > -1) {
    this.stateArray.splice(i, 1);
  }
  this._super$removeFromOwn(record, idx);
};

export default HasManyBucket;

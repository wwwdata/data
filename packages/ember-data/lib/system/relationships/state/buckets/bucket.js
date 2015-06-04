import OrderedSet from "ember-data/system/ordered-set";
import Relationship from "ember-data/system/relationships/state/relationship";

var forEach = Ember.EnumerableUtils.forEach;

var Bucket = function(name,store, record, inverseKey, relationshipMeta, relationship) {
  this.store = store;
  this.name = name;
  this.members = new OrderedSet();
  this.record = record;
  this.inverseKey = inverseKey;
  this.inverseKeyForImplicit = this.record.constructor.modelName + this.key;
  this.relationship = relationship;
};

Bucket.prototype = {
  constructor: Bucket,
  addRecords: function(records, idx) {
    forEach(records, (record) => {
      this.addRecord(record, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  },

  removeRecords: function(records, idx) {
    for (var i=0; i<records.length; i++) {
      if (idx !== undefined) {
        this.removeRecord(records[i], i+idx);
      } else {
        this.removeRecord(records[i]);
      }
    }
  },

  add: function(record, idx) {
    if (!this.members.has(record)) {
      this.members.add(record);
      if (this.inverseKey) {
        record._relationships.get(this.inverseKey).addCanonicalRecord(this.record);
      } else {
        if (!record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, record, this.key,  { options: {} });
        }
        record._implicitRelationships[this.inverseKeyForImplicit].buckets[this.name].add(this.record);
      }
    }
    //FIXME cleanup
    this.relationship.setHasData(true);
    this.relationship.flushCanonicalLater();
  },

  remove: function(record, idx) {
    if (this.members.has(record)) {
      this.removeFromOwn(record);
      if (this.inverseKey) {
        this.removeFromInverse(record);
      } else {
        if (record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit].buckets[this.name].remove(this.record);
        }
      }
    }
    this.relationship.flushCanonicalLater();
  },

  removeFromInverse: function(record) {
    var inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.buckets[this.name].removeFromOwn(this.record);
    }
  },

  removeFromOwn: function(record) {
    this.members.delete(record);
    //FIXME figure out
    //this.flushCanonicalLater();
    this.relationship.flushCanonicalLater();
  },
};

Bucket.prototype = Ember.create(Bucket.prototype);

export default Bucket;

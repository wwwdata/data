import OrderedSet from "ember-data/system/ordered-set";
import Bucket from "./buckets/bucket";

var forEach = Ember.EnumerableUtils.forEach;

function Buckets(store, record, inverseKey, relationshipMeta, relationship) {
  this.canonical = new Bucket('canonical', store, record, inverseKey, relationshipMeta, relationship);
  this.current = new Bucket('current', store, record, inverseKey, relationshipMeta, relationship);
}

function Relationship(store, record, inverseKey, relationshipMeta) {
  this.members = new OrderedSet();
  this.buckets = new Buckets(store, record, inverseKey, relationshipMeta, this);
  this.store = store;
  this.key = relationshipMeta.key;
  this.inverseKey = inverseKey;
  this.record = record;
  this.isAsync = relationshipMeta.options.async;
  this.relationshipMeta = relationshipMeta;
  //This probably breaks for polymorphic relationship in complex scenarios, due to
  //multiple possible modelNames
  this.inverseKeyForImplicit = this.record.constructor.modelName + this.key;
  this.linkPromise = null;
  this.hasData = false;
}

Relationship.prototype = {
  constructor: Relationship,

  destroy: Ember.K,

  clear: function() {
    var members = this.members.list;
    var member;

    while (members.length > 0) {
      member = members[0];
      this.removeRecord(member);
    }
  },

  disconnect: function() {
    this.members.forEach(function(member) {
      this.removeRecordFromInverse(member);
    }, this);
  },

  reconnect: function() {
    this.members.forEach(function(member) {
      this.addRecordToInverse(member);
    }, this);
  },

  removeRecords: function(records) {
    var self = this;
    forEach(records, function(record) {
      self.removeRecord(record);
    });
  },

  addRecords: function(records, idx) {
    var self = this;
    forEach(records, function(record) {
      self.addRecord(record, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  },

  addCanonicalRecords: function(records, idx) {
    this.buckets.canonical.addRecords(records, idx);
  },

  addCanonicalRecord: function(record, idx) {
    this.buckets.canonical.add(record, idx);
  },

  removeCanonicalRecords: function(records, idx) {
    this.buckets.canonical.removeRecords(records, idx);
  },

  removeCanonicalRecord: function(record, idx) {
    this.buckets.canonical.remove(record, idx);
  },

  addRecord: function(record, idx) {
    if (!this.members.has(record)) {
      this.members.addWithIndex(record, idx);
      this.notifyRecordRelationshipAdded(record, idx);
      if (this.inverseKey) {
        record._relationships.get(this.inverseKey).addRecord(this.record);
      } else {
        if (!record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, record, this.key,  { options: {} });
        }
        record._implicitRelationships[this.inverseKeyForImplicit].addRecord(this.record);
      }
      this.record.updateRecordArraysLater();
    }
    this.setHasData(true);
  },

  removeRecord: function(record) {
    if (this.members.has(record)) {
      this.removeRecordFromOwn(record);
      if (this.inverseKey) {
        this.removeRecordFromInverse(record);
      } else {
        if (record._implicitRelationships[this.inverseKeyForImplicit]) {
          record._implicitRelationships[this.inverseKeyForImplicit].removeRecord(this.record);
        }
      }
    }
  },

  addRecordToInverse: function(record) {
    if (this.inverseKey) {
      record._relationships.get(this.inverseKey).addRecord(this.record);
    }
  },

  removeRecordFromInverse: function(record) {
    var inverseRelationship = record._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeRecordFromOwn(this.record);
    }
  },

  removeRecordFromOwn: function(record) {
    this.members.delete(record);
    this.notifyRecordRelationshipRemoved(record);
    this.record.updateRecordArrays();
  },

  flushCanonical: function() {
    this.willSync = false;
    //a hack for not removing new records
    //TODO remove once we have proper diffing
    var newRecords = [];
    for (var i=0; i<this.members.list.length; i++) {
      if (this.members.list[i].isNew()) {
        newRecords.push(this.members.list[i]);
      }
    }
    //TODO(Igor) make this less abysmally slow
    //FIXME maybe shouldn't acces directly
    this.members = this.buckets.canonical.members.copy();
    for (i=0; i<newRecords.length; i++) {
      this.members.add(newRecords[i]);
    }
  },

  flushCanonicalLater: function() {
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    var self = this;
    this.store._backburner.join(function() {
      self.store._backburner.schedule('syncRelationships', self, self.flushCanonical);
    });
  },

  updateLink: function(link) {
    Ember.warn("You have pushed a record of type '" + this.record.type.modelName + "' with '" + this.key + "' as a link, but the association is not an async relationship.", this.isAsync);
    Ember.assert("You have pushed a record of type '" + this.record.type.modelName + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);
    if (link !== this.link) {
      this.link = link;
      this.linkPromise = null;
      this.record.notifyPropertyChange(this.key);
    }
  },

  findLink: function() {
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      var promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then(function(result) {
        return result;
      });
    }
  },

  updateRecordsFromAdapter: function(records) {
    //TODO(Igor) move this to a proper place
    var self = this;
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    self.computeChanges(records);
    self.setHasData(true);
  },

  notifyRecordRelationshipAdded: Ember.K,
  notifyRecordRelationshipRemoved: Ember.K,

  setHasData: function(value) {
    this.hasData = value;
  }
};




export default Relationship;

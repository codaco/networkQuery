/* eslint-env jest */
const query = require('../query');
const fasterFilter = require('../faster-filter').fasterFilter;

// construction from https://github.com/codaco/Network-Canvas/wiki/Network-Query-Builder
const makeFilter = logic =>
  query[logic.join.toLowerCase()](logic.rules.map(rule => query[`${rule.type}Rule`](rule.options)));
const filter = (network, logic) => makeFilter(logic)(network);

const makeOrLogic = (...rules) => ({ join: 'OR', rules });
const makeAndLogic = (...rules) => ({ join: 'AND', rules });

const alterRule = options => ({ options, type: 'alter' });
const edgeRule = options => ({ options, type: 'edge' });
const egoRule = options => ({ options, type: 'ego' });

describe('filtering', () => {
  let personId = 0;
  const person = (name) => {
    personId += 1;
    return { name, _uid: personId, id: personId, type: 'person' };
  };

  describe('a simple network', () => {
    const network = Object.freeze({
      nodes: [person('Me'), person('Carl')],
      edges: [{ from: 1, to: 2, type: 'friends' }],
    });

    it('returns one edge', () => {
      const logic = makeOrLogic(edgeRule({ operator: 'EXISTS', type: 'friends' }));
      expect(fasterFilter(network, logic).edges).toHaveLength(1);
      expect(filter(network, logic).edges).toHaveLength(1);
    });

    it('returns one node with ego rule', () => {
      const logic = makeAndLogic(egoRule({ attribute: 'name', operator: 'EXACTLY', value: 'Me' }));
      expect(fasterFilter(network, logic).nodes).toHaveLength(1);
      expect(filter(network, logic).nodes).toHaveLength(1);
    });

    it('returns no nodes based on ego not matching', () => {
      const logic = makeAndLogic(egoRule({ attribute: 'name', operator: 'EXACTLY', value: 'NotMe' }));
      expect(fasterFilter(network, logic).nodes).toHaveLength(0);
      expect(filter(network, logic).nodes).toHaveLength(0);
    });

    it('returns one node based on alter name', () => {
      const logic = makeAndLogic(alterRule({ attribute: 'name', operator: 'EXACTLY', value: 'Carl', type: 'person' }));
      expect(fasterFilter(network, logic).nodes).toHaveLength(1);
      expect(filter(network, logic).nodes).toHaveLength(1);
    });

    it('returns no edges when only one node present', () => {
      const logic = makeAndLogic(alterRule({ attribute: '_uid', operator: 'EXACTLY', value: 1, type: 'person' }));
      expect(fasterFilter(network, logic).edges).toHaveLength(0);
      expect(filter(network, logic).edges).toHaveLength(0);
    });

    it('returns no edges when only an ego node present', () => {
      const logic = makeAndLogic(egoRule({ attribute: '_uid', operator: 'EXACTLY', value: 1, type: 'person' }));
      expect(fasterFilter(network, logic).edges).toHaveLength(0);
      expect(filter(network, logic).edges).toHaveLength(0);
    });

    it.skip('is undefined behavior when network contains edges that do not map to nodes?', () => {
      const nodelessNetwork = { nodes: [], edges: network.edges };
      const logic = makeOrLogic(edgeRule({ operator: 'EXISTS', type: 'friends' }));
      expect(fasterFilter(nodelessNetwork, logic).edges).toHaveLength(0);
      expect(filter(nodelessNetwork, logic).edges).toHaveLength(0);
    });
  });
});

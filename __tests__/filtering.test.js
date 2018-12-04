/* eslint-env jest */
const query = require('../query');
const fasterFilter = require('../faster-filter').fasterFilter;
const nodeAttributesProperty = require('../nodeAttributesProperty');

// construction from https://github.com/codaco/Network-Canvas/wiki/Network-Query-Builder
const makeFilter = logic =>
  query[logic.join.toLowerCase()](logic.rules.map(rule => query[`${rule.type}Rule`](rule.options)));
const filter = (network, logic) => makeFilter(logic)(network);

const makeOrLogic = (...rules) => ({ join: 'OR', rules });
const makeAndLogic = (...rules) => ({ join: 'AND', rules });

const alterRule = options => ({ options, type: 'alter' });
const edgeRule = options => ({ options, type: 'edge' });

describe('filtering', () => {
  let personId = 0;
  const person = (attributes) => {
    personId += 1;
    return { _uid: personId, type: 'person', [nodeAttributesProperty]: attributes };
  };

  describe('a simple network', () => {
    const network = Object.freeze({
      nodes: [
        person({ name: 'Jimmy' }),
        person({ name: 'Carl' }),
        person({ name: 'William' }),
        person({ name: 'Theodore' }),
      ],
      edges: [
        { from: 1, to: 2, type: 'friends' },
        { from: 1, to: 2, type: 'running_club' },
        { from: 1, to: 3, type: 'friends' },
        { from: 3, to: 4, type: 'band_members' },
      ],
    });

    it('edge rule is node centric and orphaned edges are trimmed', () => {
      const logic = makeOrLogic(edgeRule({ operator: 'EXISTS', type: 'running_club' }));
      expect(fasterFilter(network, logic).edges).toHaveLength(2);
      expect(filter(network, logic).edges).toHaveLength(2);
    });

    it('edge rules support NOT_EXISTS', () => {
      const logic = makeAndLogic(
        edgeRule({ operator: 'EXISTS', type: 'friends' }),
        edgeRule({ operator: 'NOT_EXISTS', type: 'band_members' }),
      );
      expect(fasterFilter(network, logic).edges).toHaveLength(2);
      expect(filter(network, logic).nodes).toHaveLength(2);
    });

    it('returns one node based on alter name', () => {
      const logic = makeAndLogic(
        alterRule({ attribute: 'name', operator: 'EXACTLY', value: 'Carl', type: 'person' })
      );
      expect(fasterFilter(network, logic).nodes).toHaveLength(1);
      expect(filter(network, logic).nodes).toHaveLength(1);
    });

    it('returns no edges when only one node present', () => {
      const logic = makeAndLogic(alterRule({ attribute: '_uid', operator: 'EXACTLY', value: 1, type: 'person' }));
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

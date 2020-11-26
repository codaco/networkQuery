/* eslint-env jest */
const getQuery = require('../query').default;
const nodeAttributesProperty = require('../nodeAttributesProperty');
const helpers = require('./helpers');

const generateNode = helpers.getNodeGenerator();
const generateRuleConfig = helpers.generateRuleConfig;

const network = {
  ego: {
    [nodeAttributesProperty]: {
      age: 20,
      favoriteColor: 'blue',
    },
  },
  nodes: [
    generateNode({ name: 'William', age: 19, favoriteColor: 'green' }),
    generateNode({ name: 'Theodore', age: 18, favoriteColor: 'red' }),
    generateNode({ name: 'Rufus', age: 51, favoriteColor: 'red' }),
    generateNode({ name: 'Phone Box' }, 'publicUtility'),
  ],
  edges: [
    { from: 1, to: 2, type: 'friend' },
    { from: 2, to: 3, type: 'friend' },
    { from: 1, to: 3, type: 'friend' },
    { from: 1, to: 2, type: 'band' },
  ],
};

describe('query', () => {
  it('query returns a boolean', () => {
    const queryConfig = {
      rules: [
        generateRuleConfig('alter', {
          type: 'person',
          operator: 'LESS_THAN',
          attribute: 'age',
          value: 20,
        }),
      ],
      join: 'OR',
    };

    const query = getQuery(queryConfig);
    const result = query(network);
    expect(result).toBe(true);
  });

  describe('rule types', () => {
    const trueEgoRule1 = generateRuleConfig('ego', {
      operator: 'EXACTLY',
      attribute: 'age',
      value: 20,
    });

    const trueEgoRule2 = generateRuleConfig('ego', {
      operator: 'EXACTLY',
      attribute: 'favoriteColor',
      value: 'blue',
    });

    const falseEgoRule1 = generateRuleConfig('ego', {
      operator: 'EXACTLY',
      attribute: 'age',
      value: 10,
    });

    const trueAlterRule1 = generateRuleConfig('alter', {
      type: 'person',
      operator: 'LESS_THAN',
      attribute: 'age',
      value: 20,
    });

    const falseAlterRule1 = generateRuleConfig('alter', {
      type: 'person',
      operator: 'LESS_THAN',
      attribute: 'age',
      value: 0,
    });

    describe('ego rules', () => {
      it('ego rules are run against the ego node (pass)', () => {
        const sucessfulQuery = getQuery({
          rules: [trueEgoRule1],
        });

        expect(sucessfulQuery(network)).toEqual(true);
      });

      it('ego rules are run against the ego node (fail)', () => {
        const failingQuery = getQuery({
          rules: [falseEgoRule1],
        });

        expect(failingQuery(network)).toEqual(false);
      });

      it('AND ego rules mean the ego must match BOTH ego rules (example pass)', () => {
        const successfulQuery = getQuery({
          join: 'AND',
          rules: [trueEgoRule1, trueEgoRule2],
        });

        expect(successfulQuery(network)).toEqual(true);
      });

      it('AND ego rules mean the ego must match BOTH ego rules (example fail)', () => {
        const failingQuery = getQuery({
          join: 'AND',
          rules: [falseEgoRule1, trueEgoRule2],
        });

        expect(failingQuery(network)).toEqual(false);
      });
    });

    describe('alter rules', () => {
      it('an alter rule passes if ANY node matches the rule', () => {
        const successfulQuery = getQuery({
          rules: [trueAlterRule1],
        });

        expect(successfulQuery(network)).toEqual(true);

        const failingQuery = getQuery({
          rules: [falseAlterRule1],
        });

        expect(failingQuery(network)).toEqual(false);
      });

      it('AND alter rules mean a SINGLE NODE must match BOTH alter rules (example pass)', () => {
        const successfulQuery = getQuery({
          join: 'AND',
          rules: [
            trueAlterRule1,
            generateRuleConfig('alter', {
              type: 'person',
              operator: 'EXACTLY',
              attribute: 'favoriteColor',
              value: 'red',
            }),
          ],
        });

        expect(successfulQuery(network)).toEqual(true);
      });

      it('AND alter rules mean a SINGLE NODE must match BOTH alter rules (example fail)', () => {
        const failingQuery = getQuery({
          join: 'AND',
          rules: [
            falseAlterRule1,
            generateRuleConfig('alter', {
              type: 'person',
              operator: 'EXACTLY',
              attribute: 'favoriteColor',
              value: 'red',
            }),
          ],
        });

        expect(failingQuery(network)).toEqual(false);
      });
    });

    describe('edge rules', () => {
      it('an edge EXISTS when it can be found on ANY SINGLE NODE in the network', () => {
        const successfulQuery = getQuery({
          rules: [
            generateRuleConfig('edge', { type: 'friend', operator: 'EXISTS' }),
          ],
        });

        expect(successfulQuery(network)).toEqual(true);
      });

      it('an edge NOT_EXISTS when it can NOT be found on ANY SINGLE NODE in the network', () => {
        const failingQuery = getQuery({
          rules: [
            generateRuleConfig('edge', { type: 'enemies', operator: 'NOT_EXISTS' }),
          ],
        });

        expect(failingQuery(network)).toEqual(true);
      });

      it('AND edge rules mean a SINGLE NODE must match BOTH edge rules (example pass)', () => {
        const andQuery = getQuery({
          join: 'AND',
          rules: [
            generateRuleConfig('edge', { type: 'friend', operator: 'EXISTS' }),
            generateRuleConfig('edge', { type: 'band', operator: 'EXISTS' }),
          ],
        });

        expect(andQuery(network)).toEqual(true);
      });

      it('AND edge rules mean a SINGLE NODE must match BOTH edge rules (example fail)', () => {
        const failingAndQuery = getQuery({
          join: 'AND',
          rules: [
            generateRuleConfig('edge', { type: 'friend', operator: 'EXISTS' }),
            generateRuleConfig('edge', { type: 'enemies', operator: 'EXISTS' }),
          ],
        });

        expect(failingAndQuery(network)).toEqual(false);
      });
    });

    describe('combining rule types', () => {
      const trueEdgeRule = generateRuleConfig('edge', { type: 'friend', operator: 'EXISTS' });

      it('when ego and alter/edge rules are joined by AND, they are combined with their own group before those results are then combined again (example pass)', () => {
        const successfulQuery = getQuery({
          join: 'AND',
          rules: [trueEgoRule1, trueEgoRule2, trueAlterRule1, trueEdgeRule],
        });

        expect(successfulQuery(network)).toEqual(true);
      });

      it('when ego and alter/edge rules are joined by AND, they are combined with their own group before those results are then combined again (example fail)', () => {
        const successfulQuery = getQuery({
          join: 'AND',
          rules: [trueEgoRule1, trueEgoRule2, falseAlterRule1, trueEdgeRule],
        });

        expect(successfulQuery(network)).toEqual(false);
      });

      it('when ego and alter/edge rules are joined by OR, they are combined with their own group before those results are then combined again (example pass)', () => {
        const successfulQuery = getQuery({
          join: 'OR',
          rules: [trueEgoRule1, falseAlterRule1, trueEdgeRule],
        });

        expect(successfulQuery(network)).toEqual(true);
      });
    });

    it('correctly returns NOT_EXISTS', () => {
      const nodeType = 'TYPE_THAT_DOESNT_EXIST';
      const testQuery = {
        join: 'AND',
        rules: [
          generateRuleConfig('alter', {
            type: nodeType,
            operator: 'NOT_EXISTS',
          }),
          generateRuleConfig('alter', {
            type: nodeType,
            operator: 'NOT_EXISTS',
          }),
        ],
      };
      const query = getQuery(testQuery);
      const mockNetwork = {
        ...network,
        nodes: [
          ...network.nodes,
          generateNode({ name: 'New type' }, nodeType),
        ],
      };
      const result = query(network);
      expect(result).toEqual(true);
      const result2 = query(mockNetwork);
      expect(result2).toEqual(false);
    });
  });
});

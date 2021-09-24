const nock = require('nock');
const { expect } = require('chai');

const { x5cSingle } = require('./keys');
const { JwksClient } = require('../src/JwksClient');

describe('JwksClient (cache)', () => {
  const jwksHost = 'http://my-authz-server';

  beforeEach(() => {
    nock.cleanAll();
  });

  describe('#getSigningKey', () => {
    describe('should cache successful public key responses', () => {

      afterEach(async () => {
        // Stop the JWKS server
        nock.cleanAll();
      });

      it('should not cache error result when get signing key given idp returns server error', async () => {
        const client = new JwksClient({
          cache: true,
          jwksUri: `${jwksHost}/.well-known/jwks.json`
        });

        nock(jwksHost)
          .get('/.well-known/jwks.json')
          .reply(500);

        nock(jwksHost)
          .get('/.well-known/jwks.json')
          .reply(200, x5cSingle);

        try {
          // Do not cache error
          await client.getSigningKey('NkFCNEE1NDFDNTQ5RTQ5OTE1QzRBMjYyMzY0NEJCQTJBMjJBQkZCMA');
          expect.fail('should have thrown error');
        } catch (err) {
          expect(err).not.to.be.null;
        }

        console.log('pass first test')

        // Get signing key from server instead of resolving from cache
        const key = await client.getSigningKey('NkFCNEE1NDFDNTQ5RTQ5OTE1QzRBMjYyMzY0NEJCQTJBMjJBQkZCMA');
        expect(key.kid).to.equal('NkFCNEE1NDFDNTQ5RTQ5OTE1QzRBMjYyMzY0NEJCQTJBMjJBQkZCMA');

        console.log('pass second test')
        // expect(nock.isDone()).to.be.true()
      });
    });

    describe('should cache requests per kid', () => {
      let client;

      beforeEach(async () => {
        nock(jwksHost)
          .get('/.well-known/jwks.json')
          .reply(200, x5cSingle);

        client = new JwksClient({
          cache: true,
          jwksUri: `${jwksHost}/.well-known/jwks.json`
        });

        // Cache the Key
        const key = await client.getSigningKey('NkFCNEE1NDFDNTQ5RTQ5OTE1QzRBMjYyMzY0NEJCQTJBMjJBQkZCMA');
        expect(key.kid).to.equal('NkFCNEE1NDFDNTQ5RTQ5OTE1QzRBMjYyMzY0NEJCQTJBMjJBQkZCMA');
        // Stop the JWKS server
        nock.cleanAll();
      });

      it('should ignore the cache when the KID isnt cached and make a requst', async () => {
        try {
          await client.getSigningKey('12345');
          throw new Error('should have thrown error');
        } catch (err) {
          expect(err).not.to.be.null;
          expect(err.code).to.equal('ENOTFOUND');
        }
      });

      it('should fetch the key from the cache', async () => {
        const key = await client.getSigningKey('NkFCNEE1NDFDNTQ5RTQ5OTE1QzRBMjYyMzY0NEJCQTJBMjJBQkZCMA');
        expect(key.kid).to.equal('NkFCNEE1NDFDNTQ5RTQ5OTE1QzRBMjYyMzY0NEJCQTJBMjJBQkZCMA');
      });
    });
  });
});

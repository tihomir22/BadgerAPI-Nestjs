import { RedireccionadorMiddleware } from './redireccionador.middleware';

describe('RedireccionadorMiddleware', () => {
  it('should be defined', () => {
    expect(new RedireccionadorMiddleware()).toBeDefined();
  });
});

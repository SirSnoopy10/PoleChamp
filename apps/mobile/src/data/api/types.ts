import type { paths } from '@polechamp/contracts/api-types';

/** Typy z OpenAPI (`openapi-typescript`, IMP-067) – zmiana kontraktu = błąd kompilacji. */
export type { paths };

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Operation<P extends keyof paths, M extends Method> = NonNullable<paths[P][M]>;
type JsonOf<T> = T extends { content: { 'application/json': infer J } } ? J : never;

/** Treść żądania: `ApiBody<'/v1/tournaments', 'post'>`. */
export type ApiBody<P extends keyof paths, M extends Method> =
  Operation<P, M> extends { requestBody?: infer B } ? JsonOf<NonNullable<B>> : never;

/** Odpowiedź sukcesu (2xx): `ApiResponse<'/v1/tournaments', 'get'>`. */
export type ApiResponse<P extends keyof paths, M extends Method> =
  Operation<P, M> extends { responses: infer R }
    ? { [S in keyof R]: S extends 200 | 201 | 202 ? JsonOf<R[S]> : never }[keyof R]
    : never;

/** Parametry ścieżki: `ApiPath<'/v1/tournaments/{tournamentId}', 'get'>`. */
export type ApiPath<P extends keyof paths, M extends Method> =
  Operation<P, M> extends { parameters: { path?: infer A } } ? NonNullable<A> : never;

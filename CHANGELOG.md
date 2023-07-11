# 🔖 Changelog

## Unreleased

Breaking changes:

- Expose logging utilities in `@causa/runtime/testing` rather than `@causa/runtime/logging/testing`.

Features:

- Accept several overrides in `makeTestAppFactory`.
- Implement the `serializeAsJavaScriptObject` testing utility.
- Define the `terminusModuleWithLogger` NestJS module.

Fixes:

- Ensure missing DTO properties are not filled as `undefined` in the `ValidationPipe`.

## v0.2.0 (2023-07-04)

Breaking changes:

- Remove the useless `HealthcheckModule`. Services should implement their own endpoint, possibly using `@nestjs/terminus`. `HEALTHCHECK_ENDPOINT` is still available, as the normalized healthcheck path.
- Refactor entity error types to allow extra data to be missing.

Features:

- Allow customization of the update logic in the `VersionedEntityManager`.

## v0.1.0 (2023-06-26)

Features:

- Define the `ObjectSerializer` interface and its `JsonObjectSerializer` implementation.
- Implement the `JsonSerializableBigInt` decorator.
- Define the `Event` and `EventPublisher` interfaces.
- Define the `EventTransaction` interface and implement the `BufferEventTransaction`.
- Implement the `Transaction` class.
- Implement the base `TransactionRunner`.
- Define the `VersionedEntity`, `VersionedEntityStateTransaction`, and `VersionedEntityTransaction`.
- Define TypeScript typing utilities.
- Define entity errors.
- Implement the `VersionedEntityEventProcessor` and the `VersionedEntityManager`.
- Implement `validateObject` and `parseObject`.
- Implement validation decorators.
- Implement logging utilities: `getPinoConfiguration`, `updatePinoConfiguration`, `createLogger` and `getDefaultLogger`.
- Implement logging testing utilities.
- Implement the `LockManager`.
- Implement the NestJS application factory and corresponding testing utilities.
- Implement the `LoggerModule`.
- Implement the `HealthcheckModule`.
- Define base HTTP errors with OpenAPI support.
- Implement the `ExceptionFilterModule`.
- Implement the `ValidationPipe` and `ValidationModule`.
- Define reusable DTOs for validation with OpenAPI support.
- Implement the OpenAPI `ApiConstantProperty` decorator.
- Implement authentication-related utilities and NestJS module.
- Implement event-related utilities for NestJS.
- Implement pagination utilities.

# 🔖 Changelog

## Unreleased

Features:

- Implement the `@ApiErrorDescription`, `@ApiErrorStatusCode`, and `@ApiErrorResponses` decorators to enrich OpenAPI generation.

## v0.6.1 (2023-09-11)

Chores:

- Upgrade dependencies.
- Configure the repository as a Causa project.
- Fix typo in documentation.

## v0.6.0 (2023-07-26)

Features:

- Implement the `LoggerModule.forRoot()` function to accept an optional logger during initialization.
- Add the `prettyLogs` option for the `makeTestAppFactory()` testing utility.

Fixes:

- Ensure `updatePinoConfiguration` calls are included in the logger provided by the `LoggerModule` by loading the module asynchronously.

## v0.5.0 (2023-07-21)

Features:

- Expose the `PinoLogger` as the logger to use from the NestJS utilities.
- Allow a null `Query` when constructing a `Page`.

## v0.4.0 (2023-07-19)

Features:

- Implement the `IsObjectWithValuesSatisfying` decorator.
- Define the `EventWithPickedData` type.

## v0.3.2 (2023-07-12)

Fixes:

- Handle `null`s when removing `undefined`` properties recursively during validation.

## v0.3.1 (2023-07-11)

Fixes:

- Allow `null` type in validation decorators.
- Handle `null` and `undefined` in the `JsonSerializableBigInt` decorator.

## v0.3.0 (2023-07-11)

Breaking changes:

- Expose logging utilities in `@causa/runtime/testing` rather than `@causa/runtime/logging/testing`.
- Make the projection function in the `VersionedEntityEventProcessor` async and pass the current transaction.
- Rename `findExistingEntityOrFail` to `findExistingEntityWithVersionOrFail`.

Features:

- Accept several overrides in `makeTestAppFactory`.
- Implement the `serializeAsJavaScriptObject` testing utility.
- Define the `terminusModuleWithLogger` NestJS module.
- Implement the `IsDateType` and `ValidateNestedType` decorators.

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

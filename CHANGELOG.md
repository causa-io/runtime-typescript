# 🔖 Changelog

## Unreleased

## v1.5.0 (2026-01-12)

Features:

- Make the `throwFn` argument optional in the `rethrow` error case utility. If not provided, the original error is rethrown.
- Support `existingEntity` option in `VersionedEntityManager.create` to skip the entity lookup.
- Support `useExisting` option in `LockManager.acquire` to reuse an existing released lock entity.
- Deprecate the `BaseHealthIndicatorService` in favor of the `HealthChecker` interface.

## v1.4.0 (2025-11-04)

Features:

- Define `VersionedEventProcessor.getInTransaction` to get the projection. This allows customizing how the projection is retrieved when getting the primary key is more complex than just using the projection type.

Fixes:

- Ensure the transaction and read-only transaction types for a runner are compatible.

## v1.3.0 (2025-10-16)

Features:

- Add the `Writable` exported type.
- Support passing a query of a different type to `Page.map`.

Chores:

- Rename flat types used in recursive types (e.g. `NullableAsOptional_`), and mark the originals as deprecated.

## v1.2.1 (2025-10-01)

Fixes:

- Ensure the method name and metadata is preserved when wrapping using `@TryMap`.

## v1.2.0 (2025-10-01)

Features:

- Implement `Page.serialize()` to return a type matching a serialized DTO.

## v1.1.0 (2025-10-01)

Features:

- Implement `Page.map()` to transform items in a page but keep the pagination information.
- Implement `PageQuery.withLimit()` to handle both a maximum and a default limit.

Fixes:

- Allow `tryMap` error cases to return the type or a promise of it.

## v1.0.0 (2025-07-18)

Breaking changes:

- Use the same message for success and error HTTP logs.
- Remove `req`, `res`, `serviceContext`, and `responseTime` from prettified logs when debugging.

Features:

- Accept an optional side effect function with `toNull`.

## v1.0.0-rc.4 (2025-07-17)

Breaking changes:

- Make `tryMap` accept a rest parameter for error cases.

Features:

- Define utility functions to create error cases (e.g. `toValue`, `toDto`).
- Implement the `@TryMap` decorator.
- Implement the `CacheFixture`.

## v1.0.0-rc.3 (2025-07-16)

Breaking changes:

- Return `null` instead of `undefined` in `[State]Transaction.get`.

Features:

- Define `VersionedEventProcessor.throwNotFoundError` to allow customizing the thrown error.

Fixes:

- Export `tryMap`.

## v1.0.0-rc.2 (2025-07-15)

Breaking changes:

- Replace the base `HttpError` class with `makeHttpException` and `throwHttpErrorResponse` utilities, and remove `HttpError` classes from DTO definitions.
- Remove exception filters for specific entity errors.

Features:

- Accept additional provider overrides in the `AppFixture`.
- Implement the `tryMap` utility.

## v1.0.0-rc.1 (2025-07-09)

Breaking changes:

- Upgrade the minimum Node.js version to `20`.
- Refactor the `Transaction` and `TransactionRunner`, making all transactions "find replace transactions", using the `get`, `set`, and `delete` terminology.
- Define a unique `TransactionRunner.run` method which supports existing transactions (replacing `runInNewOrExisting`).
- Replace `skipVersionCheck` option with `existingState` in the `VersionedEventProcessor`.
- Make `VersionedEventProcessor.processEvent` throw instead of returning `null`, and introduce the `processOrSkipEvent` method with the old behavior.
- Allow `VersionedEventProcessor.project` to return a context, which can be used to specify a version property to use, replaces the `stateKeyForEvent` logic, and to support merges of partial projections.
- Remove the app factory pattern in `createApp`.
- Implement the `AppFixture` to replace `makeTestAppFactory`.

Features:

- Introduce the `ReadOnlyStateTransaction`, along with the corresponding `readOnly` option when creating a new transaction using a runner.
- Support transaction-wide `publishOptions`.
- Implement `VersionedEventProcessor` and `VersionedEntityManager` `get` method.
- Support `reprocessEqualVersion` in the `VersionedEventProcessor` when processing events for backfilling use cases.
- Implement the `ConfigFixture`, `LoggingFixture`, and `VersionedEntityFixture`, and define the `EventFixture`.

Fixes:

- Do not check `deletedAt` when the entity does not have a deletion property.

## v0.27.2 (2025-05-28)

Chores:

- Upgrade dependencies and remove unneeded `ts-jest` and `ts-node` dependencies.

## v0.27.1 (2025-03-05)

Chores:

- Upgrade dependencies.

## v0.27.0 (2025-02-06)

Breaking changes:

- The `LoggerModule` can no longer be used as a static module. `LoggerModule.forRoot()` must be used.

Features:

- `bufferLogs` is passed to the factory used in `createApp`. This was already set for the default factory.

Fixes:

- `flushLogs()` is called after setting the logger on the application.

## v0.26.0 (2025-01-03)

Features:

- Enable assignment of bindings to response logs.

## v0.25.0 (2024-12-04)

Breaking changes:

- Pass a factory to `OutboxTransactionRunner.runStateTransaction`.

Fixes:

- Do not reuse `OutboxEventTransaction`s upon transaction retries.

## v0.24.2 (2024-12-03)

Chores:

- Set the context for event handler interceptor loggers.

## v0.24.1 (2024-11-29)

Fixes:

- Ensure polling and publishing operations in the `OutboxEventSender` are over when the application shuts down.

## v0.24.0 (2024-11-27)

Breaking changes:

- Allow any type of object to be published in an `EventTransaction`.
- Add `PreparedEvent`-related features to the `EventPublisher` interface.

Features:

- Implement the `OutboxTransactionRunner` and `OutboxEventSender`.

## v0.23.0 (2024-11-14)

Features:

- Officially support Node.js 22.

Chores:

- Upgrade dependencies.

## v0.22.0 (2024-09-04)

Breaking changes:

- Convert uncaught `RetryableError`s to `ServiceUnavailableError`s in the global exception filter, and log them as warnings.

Features:

- Uniformize logging by making the global exception filter log the stack in the `error` field.

## v0.21.0 (2024-07-04)

Breaking change:

- Make `EventTransaction.publish` `options` optional.

Features:

- Support merging of the `redact.paths` `pino` option.
- Move redaction of the `authorization` header to the base `pino` configuration.

## v0.20.0 (2024-05-03)

Breaking changes:

- Remove `json` parser override.
- Treat `http-errors`-like errors as known in the `GlobalFilter`.
- Add the application type to `CreateAppOptions`.

Features:

- Implement the `ProtobufjsObjectSerializer`.
- Accept `extraConfiguration` in `CreateAppOptions`.
- Implement the `CloudEventsEventHandlerInterceptor`.

Fixes:

- `makeTestAppFactory` now returns a factory that supports `NestApplicationOptions`.

## v0.19.0 (2024-04-01)

Features:

- Support entities without `createdAt` or `deletedAt` in the `VersionedEntityManager`.

## v0.18.1 (2024-03-22)

Fixes:

- Remove the health check endpoint exposed by the `HealthCheckModule` from OpenAPI.

## v0.18.0 (2024-03-19)

Breaking changes:

- Rename `VersionedEntityEventProcessor` to `VersionedEventProcessor` and ease type constraints.

Features:

- Provide the `HealthCheckModule`, to ease the definition of health check endpoints.

## v0.17.0 (2024-03-07)

Features:

- Accept `NestApplicationOptions` in the `createApp` function. Custom `appFactory` should accept those options and forward them to the `NestFactory` call.

## v0.16.1 (2024-03-06)

Fixes:

- Export `VersionedEntityProjectionOptions`.

## v0.16.0 (2024-03-06)

Breaking changes:

- Change the `VersionedEntityEventProcessor` API, which now forces extending the class.

Features:

- Optionally enable fetching the state before computing the projection in the `VersionedEntityEventProcessor`.

## v0.15.0 (2024-02-08)

Breaking changes:

- Depend on `reflect-metadata` `0.2.1`.
- Set the OpenAPI type as `integer` instead of `number` when relevant for constant types.

## v0.14.0 (2024-01-22)

Breaking changes:

- Provide OpenAPI 3.1.0 documentation for `Page` instead of 3.0.X.

Features:

- Use `examples` rather than `example` in `@ApiConstantProperty` to provide OpenAPI 3.1.0 compatibility.

## v0.13.1 (2023-12-19)

Fixes:

- Validate inputs more thoroughly in `validateObject` and `parseObject`.

## v0.13.0 (2023-12-08)

Breaking changes:

- Loosen the `EventPublisher` interface and `EventBody` decorator to accept any type as event.
- Refactor the `BaseEventHandlerInterceptor` to provide more flexibility to concrete subclasses. `parseEventFromContext` should now return the parsed and validated event instead of a `Buffer`. The `BaseEventHandlerInterceptor` no longer requires a serializer, we should be managed by subclasses if needed.

Features:

- Implement the `@UseEventHandler` decorator to specify the event handler interceptor to use with a given route or controller.

## v0.12.0 (2023-11-27)

Breaking changes:

- Return the projection (or `null`) rather than a boolean in `VersionedEntityEventProcessor.processEvent`.

Features:

- Loosen the constraint on the `VersionedEntityEventProcessor` event type.

## v0.11.0 (2023-11-08)

Features:

- Implement the `@EventAttributes` decorator to retrieve event attributes from a route handler.

## v0.10.0 (2023-10-23)

Features:

- Export `VersionedEntityOperationOptions` and `VersionedEntityUpdateOptions`.
- Pass the current `transaction` to `VersionedEntityUpdateOptions.validationFn`.

## v0.9.0 (2023-10-23)

Breaking changes:

- Make the `updatedAt` version check optional in the `VersionedEntityManager`'s `update` and `delete` methods.
- The entity ID (primary key) is now a separate argument of the `VersionedEntityManager.update` function.

Features:

- `VersionedEntityManager.update` can now accept a function to construct the update data.

## v0.8.0 (2023-10-02)

Breaking changes:

- Use NestJS `Type` for all references to class types.

## v0.7.0 (2023-09-13)

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

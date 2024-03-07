# 🔖 Changelog

## Unreleased

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

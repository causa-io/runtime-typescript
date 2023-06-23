# 🔖 Changelog

## Unreleased

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

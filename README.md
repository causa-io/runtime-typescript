# Causa TypeScript runtime SDK

This is the repository for the `@causa/runtime` Node.js package. This package exposes the core concepts of Causa to backend services implemented in TypeScript and running on top of Node.js.

This runtime is mainly aimed at containerized services relying on the [NestJS framework](https://github.com/nestjs/nest). It provides many utilities in this regard, creating an additional layer on top of the NestJS architecture.

While this is an opinionated runtime enforcing Causa concepts and forcing some tech choices, it is cloud provider-independent. For a complementary package implementing GCP-specific features, see the [`@causa/runtime-google`](https://github.com/causa-io/runtime-typescript-google) package.

## 🎉 Installation

The package can be added like any other to a Node.js project:

```
npm install @causa/runtime
```

## ✨ Features

### Authentication

The way an authenticated user looks like to service is normalized as the `User` type, simply providing an `id` and possibly containing additional claims. Those claims could come from a parsed JWT for example.

A user's claims can be checked using the `doesUserSatisfyClaimRequirements` function. This is also exposed as the `@RequireUserClaims` NestJS decorator.

### Errors

This package exposes some entity-related errors (e.g. `EntityNotFoundError`) meant to be thrown by logic processing entities.

Another very useful error is the `RetryableError`. Any business logic can throw this error to indicate that the process that failed is worth retrying. The `RetryableError` can be handled differently depending on the context. For example for an event-processing function, it indicates that the processing of the event should be retried.

The `tryMap` utility can be used instead of regular try/catch blocks to more easily catch expected errors and map them to other values.

### Events

Events are a core mechanism of Causa, as they are how state changes are logged, and how services communicate between them.

The Causa runtime provides a common `Event` format (TypeScript type) for events, independently of how they might be serialized and sent to a broker. It also provides an interface to be implemented by `EventPublisher`s. However, no serialization-specific nor broker-specific code is implemented in this package.

### Lock

The `LockManager` utility provides a locking mechanism that integrates with the `Transaction` and `TransactionRunner` concepts (see the _"(Event & state) transaction"_ section).

The lock manager operates on an entity implementing the `LockEntity` interface. The manager exposes standard `acquire` and `release` methods, that are usually used as part of transactions.

While the locking mechanism of some databases could be used instead of the `LockManager`, other databases (like [Cloud Spanner](https://cloud.google.com/spanner/docs/transactions#locking)) advise against it. The benefit of the `LockManager` is to provide a logic that will work on top of any transaction that implements `FindReplaceTransaction`.

### Logging

The `@causa/runtime` package provides an opinionated way of logging, in the form of the [`pino`](https://github.com/pinojs/pino) library. A default configuration is set when `getDefaultLogger()` is first called. This configuration can be updated using `updatePinoConfiguration()`. This should occur before creating the logger.

When developing a NestJS service, this same logger can be injected using the `@causa/runtime/nestjs`'s `Logger`.

Testing utilities are also provided. `spyOnLogger()` can be used in combination with `getLogged[Objects|Infos|Warnings|Errors]()` to assert that some messages were indeed logged.

### NestJS

All features described in this section are part of the `@causa/runtime/nestjs` export.

#### Authentication

The NestJS `AuthModule` imports the [`passport` module](https://github.com/nestjs/passport) and registers the `BearerAuthGuard` and `UserClaimsGuard`.

The former expects a `passport-http-bearer` `Strategy` to be provided as a `PassportStrategy`. (For example, the `IdentityPlatformStrategy` from the `@causa/runtime-google` package.) The strategy should return a `User` object that will be forwarded to request handlers.

The latter enables the use of the `@RequireUserClaims` decorator on controllers and routes.

Other decorators are available, such as the `@AuthUser` parameter decorator (populating a route parameter with the authenticated `User`), and the `@Public` controller and route decorator (bypassing the bearer auth guard).

#### Exception filter

The NestJS `ExceptionFilterModule` provides a global filter that maps `RetryableError`s to "service unavailable errors" and handle uncaught errors by logging them and returning an "interval server error".

Error DTOs should usually conform to the `ErrorResponse` type. Catching service errors and mapping them to DTOs in controllers can be done using the `@TryMap` decorator, and the `toDto` and `toDtoType` utilities.

#### Events

As previously stated, this package does not provide any broker-specific implementation. However the NestJS counterpart of the `EventPublisher` is defined: the `@InjectEventPublisher` decorator, which can be used to inject an object that conforms to the corresponding interface.

The `BaseEventHandlerInterceptor` class is a `NestInterceptor` that provides a base for an interceptor meant to be used with brokers pushing messages as HTTP requests (e.g. Pub/Sub with a [push subscription](https://cloud.google.com/pubsub/docs/push)).

The `CloudEventsEventHandlerInterceptor` subclasses the `BaseEventHandlerInterceptor` to support CloudEvents events with HTTP binding.

When the `@EventBody` decorator is used on a route's parameter, it indicates that this route responds to HTTP requests made by a message broker pushing events. An interceptor that inherits from `BaseEventHandlerInterceptor` catches those requests and parses the incoming events, ensuring the route handler receives a typed event, ready to be processed.

#### Application factory

The `createApp` function can be used to initialize a NestJS application from a root _"business module"_ to which several base modules are imported globally: `ConfigModule` (from `@nestjs/config`), `LoggerModule`, `ValidationModule`, and `ExceptionFilterModule` (all from this package).

Note that the `AuthModule` is not automatically added because it is only relevant for front-facing APIs, and requires an additional Passport strategy to work.

#### Health check

NestJS provides the [`@nestjs/terminus`](https://github.com/nestjs/terminus) package to implement health checks, and not much can be added generically on top. The implementation of the actual health check may depend on the tech stack for example. However the `terminusModuleWithLogger` module provides Terminus properly configured with the pino logger.

When implementing a health check route, it should be exposed under the `HEALTHCHECK_ENDPOINT`, such that only error responses are logged by pino.

The `HealthCheckModule` can also be used to implement the health check route. In this case, only indicators, extending the `BaseHealthIndicatorService`, have to be implemented.

#### Logging

A `LoggerModule` is provided (and automatically imported by the application factory), which configures [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino) as the logger. The `Logger` exposed by `@causa/runtime/nestjs` can be used to inject the `PinoLogger`.

The logger is configured to automatically log all HTTP requests, removing the `authorization` header in them, and ignoring successful calls to the `HEALTHCHECK_ENDPOINT`.

#### OpenAPI

NestJS provides many decorator that helps building the OpenAPI documentation for a service. This package provides those additional decorators:

- `@ApiConstantProperty`
- `@ApiErrorDescription` and `@ApiErrorStatusCode`, to decorate subclasses of `ErrorDto`.
- `@ApiErrorResponses`, to decorate controller methods and list the possible returned errors.

#### Pagination

The Causa runtime provides some pagination utilities for REST APIs, including validation and transformation decorators. Paginated endpoints are meant to be requested with (a subclass of) a `PageQuery`, and return a `Page` of items.

#### Validation

The `ValidationModule` (automatically imported by the application factory) sets up the `ValidationPipe`, which performs transformation and validation on input objects using `class-transformer` and `class-validator`.

Basic validation classes (`IdParams` and `VersionedMutationQuery`) are also provided, meant to be used by APIs exposing CRUD operations on entities identified by a UUID V4 and versioned using an `updatedAt` property.

### Serialization

The `JsonObjectSerializer`, which implements the `ObjectSerializer` interface, performs JSON (de)serialization from and to a `Buffer` containing the JSON string. The `JsonSerializationOf` and `JsonSerializableTo` types can be used to represent JavaScript objects that have gone through JSON serialization and back (e.g. `Date`s being transformed into `string`s).

The `serializeAsJavaScriptObject` testing utility from `@causa/runtime/testing` can for example be used to compare HTTP responses with typed objects.

The `ProtobufjsObjectSerializer` handles (de)serialization of objects that are instances of classes generated by [protobuf.js](https://protobufjs.github.io/protobuf.js/).

The main purpose of `ObjectSerializer`s is to be used with an `EventPublisher` or with an event handler interceptor.

### (Event & state) transaction

Event and state `Transaction`s are a core concept of Causa, which provide a way to modify the state of a system and publish related events as part of a single transaction. `Transaction`s are created by a `TransactionRunner`, which instantiates the underlying transaction(s) to a database and a message broker. A `TransactionRunner` can also create a `ReadOnlyStateTransaction` if requested, which may avoid unnecessarily acquiring locks.

`Transaction`s and `TransactionRunner`s are used by the `LockManager`, `VersionedEntityEventProcessor`, and the `VersionedEntityManager`.

The `OutboxTransactionRunner` provides a base implementation of a runner that commits events to be published using the state transaction (in the "outbox"). The state and the events are therefore committed atomically as part of a single transaction. Then, events are published in the background by the related `OutboxEventSender`, and removed from the outbox (in the state).

### Validation

NestJS (and the NestJS-based utilities in this package) use `class-transformer` and `class-validator` to parse and validate input payloads. However those utilities work independently of NestJS, such as `validateObject` and `parseObject`.

Several `class-validator` [decorators](src/validation/decorators/index.ts) are also included.

### Event processing and versioned entities

The `VersionedEntity` is a core Causa concept that builds on top of event and state transactions. The `VersionedEntityManager` provides CRUD-like functionalities on entities, with the additional benefit of publishing events corresponding to the state changes. It also supports backfilling from the entity events, and can be extended to customize the processing of each event (e.g. to build a separate view or index).

The `VersionedEntityManager` relies on the `VersionedEntityEventProcessor`, which consumes events to build views, but does not provide the create / update / delete functionalities.

The `VersionedEntityManager` is usually extended in the service managing the entity, while a separate service that requires building its own view on the same entity will extend a `VersionedEntityEventProcessor`.

### Testing

Various testing utilities are exposed as `@causa/runtime/testing` and `@causa/runtime/nestjs/testing`. The most interesting ones are the `AppFixture` and the corresponding set of `Fixture`s. This eases creating a test NestJS application from a "business module", mocking various common functionalities, and testing the application behavior:

- `AppFixture` is the parent fixture that creates the application, initializes all the other fixtures, and provides the `request` test agent to make HTTP requests.
- The `ConfigFixture` allows changing the configuration exposed by NestJS' `ConfigService`.
- The `LoggingFixture` prettifies logs and makes it easier to check logs (e.g. that errors are logged when needed).
- The `VersionedEntityFixture` makes it easier to check for versioned entity mutations (or the lack thereof) and the corresponding published events.
- The `CacheFixture` clears all cache services (from `@nestjs/cache-manager`).

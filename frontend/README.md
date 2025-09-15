## Getting Started

### Setting up the environment

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file based on `.env.example`.

### Running locally

To run the development server, use the following command:

```bash
pnpm dev
```

### Running with Docker

Alternatively, to run the application using Docker, follow these steps:

1. Create a `.env` file based on `.env.example`.

2. Run with docker compose:

```bash
docker compose up
```

### Writing Tests

To add tests to the codebase, follow these steps:

1. **Create Test Files**: Place your test files in the `__tests__` directory, mirroring the structure of your codebase. For example, tests for `VaultCard.tsx` should be in `__tests__/components/VaultCard/VaultCard.test.tsx`.

2. **Mock Dependencies**: Use Jest to mock any hooks/ context that the component under test depends on. This isolates the component and allows you to test it in isolation.

3. **Use `mockHooks` Abstraction**: Create a `mockHooks` function to set up mock return values for hooks used in your component. This helps streamline the setup for each test case.

4. **Test Component Behavior**: Write tests to verify that the component behaves as expected under different conditions. This includes checking that it renders correctly, handles user interactions, and updates state as expected.

5. **Run Tests**: Use the command `pnpm test` to run your test suite and ensure all tests pass.

### Example Test Suite for `VaultCard`

Here's an example test suite for the `VaultCard` component, using the `mockHooks` abstraction:

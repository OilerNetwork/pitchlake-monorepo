# Pitchlake Frontend

A modern Next.js frontend application for the Pitchlake DeFi options trading platform, built with React 19, TypeScript, and StarkNet integration.

## 🚀 Features

- **StarkNet Integration**: Full wallet connection and contract interaction
- **Real-time Data**: WebSocket connections for live vault and gas price data
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Vault Management**: Interactive vault cards with real-time updates
- **Gas Price Monitoring**: Live gas price charts and TWAP calculations
- **Multi-Network Support**: Support for mainnet, sepolia, devnet, and juno networks

## ⚡ Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9.3.0+
- Access to StarkNet RPC endpoints
- Backend services running (WebSocket server, Fossil API)

### Environment Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Create environment file**:
   Create a `.env.local` file with the following variables:

   ```bash
   # Required Environment Variables
   NEXT_PUBLIC_VAULT_ADDRESSES=0x1234567890abcdef...,0x2345678901bcdef0...
   NEXT_PUBLIC_ENVIRONMENT=development
   NEXT_PUBLIC_RPC_URL_MAINNET=https://starknet-mainnet.infura.io/v3/YOUR_KEY
   NEXT_PUBLIC_RPC_URL_SEPOLIA=https://starknet-sepolia.infura.io/v3/YOUR_KEY
   NEXT_PUBLIC_RPC_URL_DEVNET=http://localhost:5050
   NEXT_PUBLIC_WS_URL=http://localhost:8080
   NEXT_PUBLIC_FOSSIL_API_URL=http://localhost:3000
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

   # Optional Environment Variables
   NEXT_PUBLIC_RPC_URL_JUNO_DEVNET=http://localhost:6060
   FOSSIL_API_KEY=your_fossil_api_key
   FOSSIL_DB_URL=postgres://user:pass@localhost:5432/db
   DEMO_ACCOUNT_ADDRESS=0x1234567890abcdef...
   DEMO_PRIVATE_KEY=0x1234567890abcdef...
   ```

### Running the Application

#### Development Mode
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

#### Production Build
```bash
pnpm build
pnpm start
```

#### Docker Deployment
```bash
# Build and run with Docker Compose
docker compose up --build

# Or build manually
docker build -t pitchlake-frontend .
docker run -p 3000:3000 pitchlake-frontend
```

## 🏗️ Architecture

The frontend follows a modern React architecture:

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   └── page.tsx           # Main page
├── components/            # Reusable UI components
│   ├── BaseComponents/    # Basic UI components
│   ├── VaultCard/         # Vault-specific components
│   └── ...
├── context/               # React context providers
│   ├── StarknetProvider.tsx
│   └── NewProvider.tsx
├── hooks/                 # Custom React hooks
│   ├── websocket/         # WebSocket hooks
│   └── window/            # Window/browser hooks
├── lib/                   # Utility libraries
│   ├── constants.ts       # Application constants
│   ├── db.ts             # Database utilities
│   └── utils.ts          # General utilities
└── view/                  # Page components
    └── HomeView.tsx
```

## 🔌 WebSocket Integration

The frontend connects to the backend WebSocket server for real-time data:

- **Home Data**: Vault information and market statistics
- **Gas Prices**: Real-time gas price updates and TWAP calculations
- **Vault Updates**: Live vault state changes and user positions

## 🌐 Network Configuration

The application supports multiple StarkNet networks:

- **Mainnet**: Production StarkNet network
- **Sepolia**: StarkNet testnet
- **Devnet**: Local development network (Katana)
- **Juno**: Juno development network

Network selection is handled automatically based on the environment configuration.

## 🧪 Testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Writing Tests

1. **Create Test Files**: Place test files in the `__tests__` directory, mirroring your component structure
2. **Mock Dependencies**: Use Jest to mock hooks and context dependencies
3. **Use `mockHooks` Abstraction**: Create mock return values for component hooks
4. **Test Component Behavior**: Verify rendering, interactions, and state updates
5. **Run Tests**: Use `pnpm test` to execute the test suite

### Example Test Structure
```
__tests__/
└── components/
    └── VaultCard/
        └── VaultCard.test.tsx
```

## 🚀 Deployment

### Environment-Specific Configuration

The application supports different deployment environments:

- **Development**: Local development with hot reloading
- **Demo**: Demo mode with mock data
- **Production**: Full production deployment

### Docker Deployment

Multiple Docker configurations are available:

- **Dockerfile**: Standard Node.js deployment
- **Dockerfile.nginx**: Nginx reverse proxy deployment
- **Dockerfile.develop**: Development environment

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_VAULT_ADDRESSES` | Yes | Comma-separated vault contract addresses |
| `NEXT_PUBLIC_ENVIRONMENT` | Yes | Environment mode (development/demo/production) |
| `NEXT_PUBLIC_RPC_URL_MAINNET` | Yes | StarkNet mainnet RPC URL |
| `NEXT_PUBLIC_RPC_URL_SEPOLIA` | Yes | StarkNet sepolia RPC URL |
| `NEXT_PUBLIC_WS_URL` | Yes | Backend WebSocket server URL |
| `NEXT_PUBLIC_FOSSIL_API_URL` | Yes | Fossil API server URL |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Backend server URL |
| `NEXT_PUBLIC_RPC_URL_DEVNET` | No | Local devnet RPC URL |
| `NEXT_PUBLIC_RPC_URL_JUNO_DEVNET` | No | Juno devnet RPC URL |
| `FOSSIL_API_KEY` | No | Fossil API authentication key |
| `FOSSIL_DB_URL` | No | Fossil database connection string |
| `DEMO_ACCOUNT_ADDRESS` | No | Demo account address for testing |
| `DEMO_PRIVATE_KEY` | No | Demo account private key |

## 🔧 Development

### Code Style

- **ESLint**: Code linting with Next.js configuration
- **Prettier**: Code formatting
- **TypeScript**: Type safety and development experience

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm format       # Format code with Prettier
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
```

### Dependencies

**Core Dependencies**:
- Next.js 15.5.3 - React framework
- React 19.1.1 - UI library
- TypeScript 5.6.3 - Type safety
- Tailwind CSS 3.4.14 - Styling
- StarkNet.js 7.6.4 - StarkNet integration

**Key Libraries**:
- @starknet-react/core - StarkNet React integration
- @tanstack/react-query - Data fetching and caching
- Chart.js - Data visualization
- Lucide React - Icons

## 📚 Documentation

For more detailed information:

- **Component Documentation**: See individual component files for detailed props and usage
- **API Integration**: Check `src/app/api/` for API route implementations
- **WebSocket Hooks**: See `src/hooks/websocket/` for real-time data handling
- **StarkNet Integration**: Check `src/context/StarknetProvider.tsx` for wallet connection

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Write tests for new components and features
3. Update documentation for any API changes
4. Ensure all environment variables are properly documented
5. Test across different network configurations

## 📄 License

See the main project repository for license information.

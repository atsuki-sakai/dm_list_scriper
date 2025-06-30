# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Common Development Commands

### Running the Application
```bash
pnpm start    # Run the TypeScript application directly with ts-node
```

### Building the Project
```bash
pnpm build    # Compile TypeScript to JavaScript in dist/
```

### Installing Dependencies
```bash
pnpm install  # Install all dependencies
```

## 📐 High-Level Architecture

This is a **HotPepper Beauty Salon Scraper** built with TypeScript following a **Layered Architecture** pattern:

```
┌─────────────────────────────────────┐
│         scraper.ts (Entry)          │  Main entry point
├─────────────────────────────────────┤
│        Controllers Layer            │  Flow orchestration
│  - areaController.ts               │  Area selection flow
│  - salonController.ts              │  Salon operations
│  - bulkSalonController.ts          │  Bulk operations
├─────────────────────────────────────┤
│         Services Layer              │  Business logic
│  - scraper.ts                      │  Web scraping core
│  - userInput.ts                    │  User interactions
│  - display.ts                      │  UI/output
│  - googleSearch*.ts                │  Google API integration
│  - csvExport.ts                    │  Data export
├─────────────────────────────────────┤
│    Utils, Constants & Types         │  Shared resources
└─────────────────────────────────────┘
```

### Key Architectural Patterns

1. **Hierarchical Data Flow**: The app follows a 3-level area selection pattern:
   - Region (地域) → Sub-area (サブエリア) → Detailed area (詳細エリア) → Salon list

2. **Service Separation**: Each service handles a specific domain:
   - `scraper.ts`: All web scraping logic using axios + cheerio
   - `userInput.ts`: CLI prompts and user interaction
   - `display.ts`: Formatted output to console
   - `googleSearch*.ts`: External API integration for additional data

3. **Type Safety**: All data structures are strongly typed in `/src/types/`
   - Area, SubArea, DetailArea, SalonDetails interfaces
   - Clear separation between scraping results and UI options

### Important Implementation Details

- **URL Resolution**: The app uses a mapping in `constants/urlMappings.ts` to convert area names to HotPepper URLs
- **CSS Selectors**: All scraping selectors are centralized in `constants/selectors.ts`
- **Rate Limiting**: Built-in delays between requests to avoid overwhelming the target site
- **Error Handling**: Each layer has appropriate error handling with user-friendly messages

### Data Extraction Fields

The scraper extracts 13 fields for each salon:
- Basic info: Name, Address, Phone, Station/Access
- Business hours and holidays
- Pricing information
- Staff count and facilities
- Special features and notes

### Google Search Integration

When enabled (requires API keys in .env), the app can fetch additional business information:
- Instagram profile
- Official website
- Google reviews and ratings
- Additional contact information

## 🔧 Development Notes

- **No Testing Framework**: Currently no tests are configured. Consider adding Jest or Vitest for unit tests.
- **No Linting**: No ESLint configuration. Consider adding for code quality.
- **Environment Variables**: Copy `.env.example` to `.env` and add Google API credentials if using search features.
- **TypeScript Strict Mode**: Enabled in tsconfig.json - all code must pass strict type checking.
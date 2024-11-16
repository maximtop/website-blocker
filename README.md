# Website Blocker by MT

Website Blocker by MT is a simple browser extension designed to help you stay focused by blocking distracting websites. This extension allows you to specify a list of websites to block, ensuring that you can maintain productivity and avoid distractions.

## Features

- **Block Websites:** Easily block access to distracting websites.
- **Customizable:** Add or remove websites from the blocked list.
- **Persistent Storage:** Blocked websites are saved and loaded from browser storage.
- **Real-time Updates:** Automatically updates the list of blocked websites when changes are made.

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/maximtop/website-blocker.git
    ```
2. Navigate to the project directory:
    ```sh
    cd website-blocker
    ```
3. Install dependencies:
    ```sh
    pnpm install
    ```
4. Build the project:
    ```sh
    pnpm build
    ```
5. Load the extension in your browser:
    - Open your browser's extensions page.
    - Enable "Developer mode".
    - Click "Load unpacked" and select the `dist` directory.

## Usage

- Open the extension's options page to add or remove websites from the blocked list.
- The extension will automatically block access to the specified websites.

## Development

To start the development server with watch mode:
```sh
pnpm start
```

To lint the code:
```sh
pnpm lint
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.

# Website Blocker by MT

Website Blocker by MT is a simple browser extension designed to help you stay focused by blocking distracting websites. This extension allows you to specify a list of websites to block, ensuring that you can maintain productivity and avoid distractions.

## Features

- **Block Websites:** Easily block access to distracting websites.
- **Timed Blocking:** Block a website for 15, 30, or 60 minutes, or enter a custom duration in whole minutes.
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
- Enter a website, select how long to block it, and click **Add**. **Indefinitely** is selected by default.
- For a timed block, choose **15 minutes**, **30 minutes**, **60 minutes**, or **Custom duration** and enter a positive whole number of minutes.
- Timed blocks show their expiry time and end automatically, even when the options page is closed or the browser is restarted. Permanent blocks remain until you delete them.
- The extension will automatically block access to the specified websites.

## Download

You can install the Website Blocker by MT extension directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/website-blocker-by-mt/enffllmgjpgoifnfeljkfhpedcadnpbj).

## Development

To start the development server with watch mode:
```sh
pnpm start
```

To lint the code:
```sh
pnpm lint
```

## Releasing

Tagged releases publish a GitHub Release with the store archive and checksums; store submission is a separate manual workflow. See [docs/RELEASE.md](docs/RELEASE.md) for the release process, store configuration, and the failure playbook.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## GitHub Repository
For more information, visit our GitHub repository: [https://github.com/maximtop/website-blocker](https://github.com/maximtop/website-blocker)

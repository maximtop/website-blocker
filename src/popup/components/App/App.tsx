import React from 'react';
import browser from 'webextension-polyfill';

// TODO change the content of the popup depending on whether the site is blocked or not.
export function App() {
    const handleClick = () => {
        browser.runtime.openOptionsPage();
    };

    return (
        <div className="container text-center" style={{ padding: '30px' }}>
            <h1 className="h5 text-danger">Website Blocker by MT</h1>
            <p className="mt-2 d-inline-flex align-items-center">
                To block or unblock, go to
                <button onClick={handleClick} type="button" className="btn btn-link p-0 ms-1">settings.</button>
            </p>
        </div>
    );
}

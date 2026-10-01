# Shared library package

`obsidian-llm-hub-common-0.1.0.tgz` contains the prebuilt shared library, including
its JavaScript and TypeScript declarations. Using the archive allows review
tools to install the dependency with `npm ci --ignore-scripts`; installing from
Git requires the library's `prepare` script to generate its `dist` directory.

Source: https://github.com/takeshy/obsidian-llm-hub-common/tree/1d5be7cd94fae89290ed52963d69c4f488c4e31e

The archive is byte-for-byte identical to the built package previously pinned
in `package-lock.json`:

```text
sha512-2J3kviTnlhihKYWvnUr45tFRqeO0oHFZW59yw3BEwn+0nmaUvdV7MP5vx+CBfCMXayv6jT+o79wxEDOTSPjUdw==
```

To update it, build and test the shared library at the intended commit, then
create its package with `npm pack`. Replace the archive, record the source
commit and integrity here, and update the dependency and lockfile. Verify a
fresh `npm ci --ignore-scripts`, followed by lint and build, before committing.

The MIT license is included in the archive.

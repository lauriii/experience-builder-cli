# Hello World Component

A simple Hello World component for Experience Builder.

## Props

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `greeting` | `string` | The greeting to display | `"Hello World"` |
| `color` | `string` | Color of the greeting text | `"#333333"` |

## Slots

| Name | Description |
|------|-------------|
| `content` | Content to display below the greeting |

## Usage

```jsx
<HelloWorld greeting="Hello Experience Builder" color="#ff5722">
  <p slot="content">This is content inside the component.</p>
</HelloWorld>
```

## Building

This component uses SWC for transpilation. To build it:

```bash
npm install
npm run build
```
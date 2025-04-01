# Experience Builder Component Guidelines

This document provides guidelines for creating components that can be successfully uploaded to Experience Builder using the CLI tool.

## Valid Format Values

When defining string properties in your `component.yml` file, use only these supported format values:

| Format Value | Description | Example |
|--------------|-------------|---------|
| `uri` | URI or URL | `https://example.com` |
| `date-time` | RFC3339/ISO8601 date and time | `2023-04-25T16:30:00Z` |
| `date` | ISO8601 date | `2023-04-25` |
| `email` | Email address | `user@example.com` |
| `uuid` | UUID string | `123e4567-e89b-12d3-a456-426614174000` |
| `uri-reference` | Relative or absolute URI | `/path/to/page` |

Do **not** use these unsupported formats:
- ❌ `format: text` 
- ❌ `format: textarea`
- ❌ `format: select`
- ❌ `format: color`

## Property Types

Experience Builder supports the following property types:

| Type | Description | Support |
|------|-------------|---------|
| `string` | Text values | ✅ Fully supported |
| `number` | Numeric values | ✅ Fully supported |
| `boolean` | True/false values | ✅ Fully supported |
| `array` | Lists/arrays | ❌ Not supported yet |
| `object` | Nested objects | ❌ Not supported yet |

## Dropdown/Select Fields

For dropdown/select fields, use `enum` instead of `format: select`:

```yaml
# ✅ DO this:
type:
  type: string
  title: Button Type
  enum: ["primary", "secondary", "outline", "link"]
  examples: ["primary", "secondary"]

# ❌ NOT this:
type:
  type: string
  title: Button Type
  format: select
  examples: ["primary", "secondary"]
```

## Complex Data Handling

For components that need to handle arrays or complex objects:

1. Use slots instead of array properties
2. Use string properties for individual items 
3. Use string properties with JSON serialization for complex data (not recommended for editor experience)

## Example of a Valid Component

```yaml
machineName: image_card
name: Image Card
required:
  - title
  - image_url
props:
  title:
    type: string
    title: Card Title
    examples: ["Beautiful Sunset", "Product Name"]
  subtitle:
    type: string
    title: Card Subtitle
    examples: ["Taken in Hawaii", "Premium Quality"]
  image_url:
    type: string
    title: Image URL
    format: uri
    examples: ["https://example.com/image.jpg"]
  alt_text:
    type: string
    title: Alt Text
    examples: ["Sunset over the ocean", "Product image"]
slots:
  footer:
    title: Card Footer
    description: Content to display at the bottom of the card
```
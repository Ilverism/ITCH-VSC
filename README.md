## About ITCH-VSC (Inline Tag Context Hider for VS Code)

ITCH-VSC is a VS Code extension used to collapse user-defined inline tags so that only the inner content is visible while viewing a file.
When the content is being edited or selected, the collapsed 'context' (e.g., inner and outer HTML tags) will automatically expand.

The original purpose of this extension was to support my web-based visual novel engine,
and the ability to have inline-styled content while retaining readability was important.

## Table of Contents
- [About](#about-itch-vsc-inline-tag-context-hider-for-vs-code)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands](#commands)
- [Examples](#examples)
- [Credits](#credits)

## Features

- Easily configurable to support different tags
- Built-in helper function to support HTML tags
- Modifiable styling for folded tags (e.g., text color, font weight, content marker, etc.)
- Exclude commented content from being folded (❗ Toggleable, ON by default)
- Support multi-line folds (❗ Toggleable, OFF by default)

## Installation

- Download the VS Code Extension **[🔗here](https://marketplace.visualstudio.com/items?itemName=ilverism.inline-tag-context-hider-vsc)**
- Run the Config Generation command:
  - Open the VS Code Command Palette
    - Windows/Linux: ```Ctrl + Shift + P``` or ```F1```
    - macOS: ```Shift + Command + P``` or ```F1```
  - Run the following command in the Command Palette: ```>ITCH-VSC: Create Fold Config```
- Follow the steps in the **Configuration** section below


## Configuration

- Use the generated ```foldconfig.mjs``` file for the configuration
- Create basic HTML tag Fold instances with the ```createHTMLFold(...)``` helper function
- Create custom Fold instances with calls to ```new Fold(...)```
- Fold instances are stored inside a static list, so there is no need to do any additional work with the created instances

## Usage

- Content matching your fold configurations will collapse automatically while the extension is enabled
- Click or select a collapsed item to expand it
- Toggle certain functionality using the commands below

## Commands

- ```>ITCH-VSC: Create Fold Config``` - _Generate the config and example files_
- ```>ITCH-VSC: Toggle``` - _Toggle the extension on/off_ - ```Ctrl + Alt + H```
- ```>ITCH-VSC: Toggle Multiline``` - _Toggle multiline functionality on/off_
- ```>ITCH-VSC: Toggle Comment Folds``` - _Toggle folding of commented content on/off_

## Examples

* Default View:
<img width="1506" height="440" alt="image" src="https://github.com/user-attachments/assets/ac9e0a6d-33e3-4f29-8644-beb9d36b0449" />

* Editing View (cursor inside or selection overlapping):
<img width="1846" height="435" alt="image" src="https://github.com/user-attachments/assets/a96fb1d5-822b-46d2-9ab8-2afef6385916" />

* Additional Examples:
<img width="1192" height="754" alt="image" src="https://github.com/user-attachments/assets/6566f4a2-ad13-4cf2-b9a3-0cf0bf801275" />

## Credits

- Extension by ilverism.
- Code comment detection (modified, ```commentconfig.ts```) via https://stackoverflow.com/a/71538680 ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/))

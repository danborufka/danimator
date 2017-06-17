# Danimator.js
Advanced scalable vector graphics animations/interactions based on Paper.js

![scr-danimator-examples-1](https://user-images.githubusercontent.com/8395474/27254790-489d37b6-5390-11e7-89e2-8a3765e140e5.gif)

## Usage

Start by importing an SVG like so:
```js
Danimator.import(svg, options);
```
This will use [Paper.js to parse the SVG to canvas](http://paperjs.org/reference/project/#importsvg-svg), rename the imported group to `scene`, and create a `sceneElement` for it.

## Basics

### scene
The scene contains all named SVG items as nested properties.
This means if you have a SVG with a group named `bear` containing a path called `snout`, you can access it like this: 
```js
scene.bear.snout
```
To change the opacity of `snout`'s Paper.js item, you'd do:
```js
scene.bear.snout.item.opacity = 0.5;
```
You can access scene elements using their according names, but use `.ordered` if you need to access them numerically:
```js
scene.bear.ordered[0];  // this will access bear's first child
```
This setup also walks thru all SVG elements, [normalizes their names](), and hides all detected [states]() and [frames]() except for the first one.

### sceneElement
sceneElements store two representations that can be accessed as properties:

property | description
-|-
**.item** | Reference to the rendered Paper.js item
**.$element** | Reference to the jQuery element of the SVG as parsed DOM

____
Both `item` and `$element` have references to this `sceneElement` in their data property.

element | access to sceneElement
-|-
item | **.data.sceneElement**
$element | **.data('sceneElement')**

____
… but you can always just use the helper method `Danimator.sceneElement(anyItem)` to retrieve its according `sceneElement` (if one exists)
____

Every sceneElement has a data store for easy data passing between jQuery elements and items inside PaperScript:
```js
scene.bear.data.hungriness = 0.8;
```

## Animating

### Danimator.animate(…)
Takes the following arguments: `element`, `property`, `from`, `to`, `duration`, `options`

argument | data type | description
-|-|-
element | _sceneElement_ or _paper.Item_ | The sceneElement (or Paper.js item) to be animated
property | _String_|The property to be animated
from | _String_ or _Number_| Start value of the animation
to | _String_ or _Number_ | End value of the animation. Numeric Strings yield in relative addition/subtraction (like "+10" will yield the current value + 10)
duration | _Number_ | Duration of the animation in seconds
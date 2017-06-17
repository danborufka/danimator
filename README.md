# Danimator.js
Advanced scalable vector graphics animations/interactions based on Paper.js

Danimator will inject its setup process into Paper.js' `Project.importSVG` method.
This will rename the imported SVG group to `scene` and create a `sceneElement` for it.

## scene
The scene contains all named SVG items as nested properties.
This means if you have a SVG with a group named `bear` containing a path called `snout`, you can access it like this: 
```js
scene.bear.snout
```
To change the opacity of `snout`'s Paper.js item, you'd do:
```js
scene.bear.snout.item.opacity = 0.5;
```

## sceneElement
sceneElements store two representations that can be accessed as properties:

property | description
-|-
**.item** | Reference to the rendered Paper.js item
**.$element** | Reference to the jQuery element of the SVG as parsed DOM


Both `item` and `$element` have references to this `sceneElement` in their data property.

element | access to sceneElement
-|-
item | **.data.sceneElement**
$element | **.data('sceneElement')**


… but you can always just use the helper method `Danimator.sceneElement(anyItem)` to retrieve its according `sceneElement` (if one exists)

### 
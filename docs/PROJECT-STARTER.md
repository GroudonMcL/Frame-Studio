Add this file to a docs folder in the repo.

Produce the below described Frame Studio application, stopping to ask me questions about how it should function where appropriate and send me screenshots showing the application’s progress.

Use existing architecture from the [https\://github.com/GroudonMcL/token-maker](https://github.com/GroudonMcL/token-maker) repo.  
Creat the application in the [https\://github.com/GroudonMcL/Frame-Studio](https://github.com/GroudonMcL/Frame-Studio) repo.

Using this application write your own prompts for the phases of development and add them to the docs folder for your own use.

Write up any additional documentation that might be useful for providing context for the project for yourself, especially in order to provide context and understanding of the existing token-maker functionality.

---

Below is the ChatGPT recommendation on how to proceed with producing my desired app based on the following request:

I have a website \- the git repo for it is here: GroudonMcL/token-maker The website allows the user to create tokens for D\&D games and other TTRPGs. The site uses code-drawn art to create the dynamic borders for tokens. I want to create a piece of software that can allow someone to draw/create code-drawn art in a visual way \- just like drawing with paint or photoshop, or maybe by adding existing code-drawn layers on top of one other and being able to edit each. How should I go about prompting you or ClaudeCode to create this tool. I'd like to be able to extract the existing borders from the repo as templates and then have them be editable. I can't code, so ideally any code-based editing would be hidden behind an "advanced" menu or something.

---

I think this is a very achievable project, and your existing Token Maker website gives you a particularly good starting point. My recommendation is to build a **visual, layer-based editor for procedural artwork**, using your existing token borders as the starting library.

The important thing is to approach it as a graphics editor with a code-generating engine underneath, rather than trying to build a visual interface for editing arbitrary code. That distinction will make the tool much easier for non-programmers to use.

I've looked through your [Token Maker repository](https://github.com/GroudonMcL/token-maker), including its README and design documentation. Based on the existing architecture, I'll explain how I'd approach the project, what I'd build first, and how I'd prompt Claude Code to implement it without having to write the code yourself.

# **1\. What I think you should build**

I'd tentatively call it **Frame Studio**, although the functionality could eventually extend well beyond token borders.

Imagine opening the application and seeing a circular token border in the middle of the screen. You can select the border, click on individual elements, add decorations, change materials and colours, or combine it with layers from other borders.

For example, you might start with your existing Arcane border, add the repeating runes from your Infernal border, place some custom gems around the edge, and finish with a glowing magical effect.

Everything would remain editable.

## **The interface**

I'd borrow ideas from Photoshop, Affinity Designer and vector graphics editors, but simplify them considerably.

I'd organise the workspace around four main areas.

**The central canvas** would display a live preview of the artwork. You could zoom in, pan around, and select elements directly. The preview would update as you adjusted settings.

**The layers panel** would be the heart of the application. Every element in the design would appear as a separate layer.

For example, your token border might have this structure:

| Layer | Purpose | Example controls |
| ----- | ----- | ----- |
| Outer backing | The base of the border | Colour, opacity, shape |
| Outer rim | The main border edge | Thickness, colour, bevel |
| Surface material | The appearance of the metal | Texture, brightness, roughness-like visual effects |
| Inner rim | The edge facing the artwork | Thickness, colour, shadow |
| Runes | Magical symbols around the border | Symbol, spacing, rotation, colour |
| Gems | Decorative elements | Shape, size, position, colour |
| Glow | Magical illumination | Colour, intensity, spread |

Each layer could have visibility, locking, duplication, renaming and reordering controls.

Some layers would contain ordinary shapes. Others would represent more complicated procedural effects.

You would not need to know how any of them were programmed.

**The properties panel** would display the settings for the selected layer. Selecting a gem would show its position, size and colour. Selecting a texture would show its pattern, scale and intensity.

Most importantly, the settings would use ordinary controls: sliders, colour pickers, dropdowns, toggles and draggable handles.

**The tools panel** would let you add new elements, including shapes, paths, repeated patterns and effects. It could also contain a library of reusable elements from existing borders.

I would keep the interface deliberately approachable. Drawing tools and common properties would be immediately available, while more complicated options would live inside expandable Advanced sections.

## **The advanced menu**

You mentioned hiding code-based editing behind an Advanced menu. I agree with the general principle, but I'd take it a step further.

There should be three ways to interact with the artwork:

**Basic editing:** Change colours, sizes, spacing, textures and other common properties.

**Advanced editing:** Access numerical coordinates, transformation settings, repetition rules, clipping, blend modes and other technical controls.

**Code view:** Optionally inspect or edit the underlying representation for users who understand code.

The first two modes should be sufficient for most users.

I'd make the code view optional, and I would not make arbitrary JavaScript the primary way to define artwork. Instead, the application's normal editing system should generate a structured definition of the artwork.

That gives you a proper visual editor without making users dependent on programming.

---

# **2\. How this fits into your existing Token Maker**

Your repository already contains much of the foundation required for this.

The design documentation describes an application built with React, Vite, TypeScript and HTML Canvas 2D. It also documents the existing code-drawn borders, their rendering pipeline and a design principle that the preview and final export should use the same renderer. [GitHub](https://github.com/GroudonMcL/token-maker/blob/main/docs/DESIGN.md)

That is useful because we don't need to invent an entirely new graphics engine.

However, there is one important complication.

### **Existing artwork isn't automatically editable**

Your website already has 27 code-drawn frames. The design documentation describes several families of frames, including classic borders, textured borders and class-themed designs. [GitHub](https://github.com/GroudonMcL/token-maker/blob/main/docs/DESIGN.md)

Those existing frames are a great starting library, but we need to distinguish between two things:

* Code that draws a finished border.  
* A structured definition of a border that describes its individual editable components.

Suppose one of your borders is drawn by a function that paints its outer rim, shadows, decorative details and texture in sequence.

We could expose the function's existing parameters, allowing users to change the overall colour, thickness and spacing. That would make the border customisable, but it wouldn't necessarily let them select an individual decorative detail and edit it separately.

To achieve that, we would need to identify the individual components and make them independently accessible.

**This is the main technical challenge, and it's why I'd build the editor in stages.**

## **The solution: a hybrid rendering system**

I would not immediately rewrite all 27 existing borders.

Instead, I'd create a new, structured system for describing artwork, which I'll call a *Frame Definition*.

A Frame Definition would describe a collection of layers and the settings that control them.

Each layer would specify what it draws, how it should be positioned, which properties can be edited, and how it interacts with the other layers.

For instance, a layer might describe a series of eight gold diamonds around a border. Its settings could specify the diamond shape, number, radius, colour, size and rotation.

Another layer might describe an engraved metal surface, with settings controlling its pattern, scale and contrast.

The renderer would interpret these definitions and draw the finished result.

Existing borders could initially be supported through special layers that call their current drawing functions. These *legacy renderer layers* would preserve the original appearance and functionality while we gradually convert their internal components into independently editable layers.

This hybrid approach has three major advantages.

First, your existing borders remain usable throughout development.

Second, you can start making new designs without waiting for every old border to be converted.

Third, you can gradually make your existing artwork more editable as the underlying system develops.

The editor can eventually support both new designs made entirely from editable layers and existing designs that combine editable layers with specialised procedural effects.

One limitation is worth understanding: a legacy border might initially behave as a single composite layer, even though its appearance was originally generated by code. Making every one of its details editable would require additional work on that individual border.

---

# **3\. What should the first version actually do?**

My biggest recommendation is to avoid asking Claude Code to build the entire application in one go.

Instead, establish the architecture first, create a small working editor, and expand it in controlled stages.

Here's the sequence I'd use.

### **Phase 1: Extract and catalogue your existing borders**

Before building the editor, Claude Code should examine your repository and identify exactly how the frames work.

It should establish where each border is defined, how the drawing functions are organised, how shared features such as shadows and highlights are implemented, and which settings are already exposed.

It should also identify which designs are straightforward to split into layers and which rely on more specialised drawing logic.

The initial deliverable should be an inventory of all existing borders, their dependencies and their editable properties.

**Do not let Claude Code start rewriting the rendering system before this audit is complete.**

### **Phase 2: Build the basic visual editor**

This is the point at which I'd begin implementing the application.

The first working version should let you select an existing border, see its current appearance and adjust the settings that its renderer already supports.

It should also provide the initial layer system, letting you add and edit a small set of basic elements on top of an existing border.

For example, you could start with shapes, outlines, filled paths and simple decorative elements.

The goal isn't to create every possible drawing tool. It's to establish that the editor can represent artwork as structured data, render it correctly and save the result.

At this stage, an existing border may still be represented by a single legacy layer.

### **Phase 3: Create a proper procedural layer system**

Once the basic editor works, expand its capabilities.

I'd add support for:

* Vector shapes, paths, lines and polygons.  
* Gradients, strokes, fills, shadows and other visual effects.  
* Repeated elements, such as runes, beads, stars and decorative symbols distributed around a circle.  
* Texture patterns, including procedural engraving, stonework, woodgrain and similar materials.  
* Layer groups, clipping, opacity, blend modes and transformations.  
* Reusable layer presets that can be added to other designs.

Repeated elements are particularly important for your use case.

Imagine selecting a row of gems around the edge of a border. You could change the number of gems, their spacing, their size and their rotation using a handful of controls, rather than editing each gem separately.

That is the kind of task for which a procedural graphics editor is especially well suited.

### **Phase 4: Make your existing borders genuinely editable**

With the layer system in place, start converting existing frames.

I'd begin with two contrasting examples: perhaps one simple border and one intricate design featuring several kinds of decoration.

These would test whether the proposed layer system can faithfully reproduce different kinds of artwork.

Each converted border should match the original appearance as closely as possible while exposing its important components as editable layers.

Once that approach is proven, the remaining borders can be converted incrementally.

### **Phase 5: Turn it into a complete creative tool**

Only once the fundamentals are reliable would I add more advanced functionality, such as:

* Drawing and editing custom paths.  
* Importing and exporting reusable layer definitions.  
* Copying layers between projects.  
* Saving custom layers to a personal library.  
* Undo and redo.  
* Autosaving projects.  
* Sharing designs as files.  
* Exporting images for previews and other applications.  
* A more powerful Advanced menu, with detailed numerical properties and optional code editing.

This staged approach also allows you to use the tool while it is being developed. You won't have to wait until every feature is finished before you can start designing borders.

---

# **4\. The most important design decision: use a structured artwork format**

Before giving Claude Code the implementation task, I'd make sure it understands that the artwork needs its own data format.

I would call the format `FrameDefinition` or `FrameProject`.

A simplified example might look like this:

{  
  "schemaVersion": 1,  
  "name": "Arcane Gold",  
  "layers": \[  
    {  
      "id": "outer-rim",  
      "name": "Outer Rim",  
      "type": "shape",  
      "visible": true,  
      "locked": false,  
      "properties": {  
        "shape": "ring",  
        "fill": "\#b88635",  
        "thickness": 0.12  
      }  
    },  
    {  
      "id": "runes",  
      "name": "Arcane Runes",  
      "type": "repeated-symbol",  
      "visible": true,  
      "locked": false,  
      "properties": {  
        "symbol": "rune",  
        "count": 8,  
        "radius": 0.82,  
        "size": 0.06,  
        "colour": "\#75d9ff"  
      }  
    }  
  \]  
}

This is an illustrative example, not a proposed final schema. The real format would need to support your actual drawing system and its coordinate conventions.

The important point is that the artwork is represented by data rather than existing exclusively inside a drawing function.

The editor can then read that data, display the layers, expose the appropriate settings and update the artwork as the user makes changes.

It also gives us a straightforward way to save and share designs.

A file could contain the complete definition of the artwork, allowing someone else to open it in Frame Studio and continue editing it.

The renderer would be responsible for turning that definition into an image.

That separation between the artwork's definition, the editing interface and the renderer is the foundation I'd insist on.

---

# **5\. How I'd prompt Claude Code**

I'd approach the prompting in two steps.

First, have Claude Code investigate the repository and produce an implementation plan without modifying anything. This establishes what is actually present in the code, rather than making assumptions about how the existing borders were implemented.

Then, after reviewing that plan, give it a tightly scoped implementation prompt.

You can use the following prompts directly.

## **Prompt 1: Audit the existing renderer and plan Frame Studio**

Open Claude Code in your existing `token-maker` repository and give it this prompt.

\# Project: Frame Studio — Architecture Audit and Implementation Plan

I want to build a visual editor for creating and editing procedural, code-drawn artwork, particularly borders for D\&D and other TTRPG tokens.

The editor should feel like a simplified combination of Photoshop and a vector graphics editor. Users should be able to select existing borders, edit their components through a visual interface, create new artwork from layers, and combine reusable elements.

The user should not need programming knowledge. Most editing should use visual tools, sliders, dropdowns and colour pickers. More technical options can live in an expandable Advanced section.

My existing website is this repository. It already includes a token renderer and a library of code-drawn borders.

\#\# Your task

For this phase, investigate the existing codebase and produce a detailed technical audit and implementation plan.

\*\*Do not modify any files yet.\*\*

Read the project's README, \`docs/DESIGN.md\`, \`docs/PROGRESS.md\`, and the relevant rendering, document, frame and testing code.

Do not assume that the documentation is completely up to date. Verify important details against the actual source code and clearly identify any discrepancies.

\#\#\# 1\. Audit the existing borders

Locate every existing code-drawn frame and explain how each is implemented.

Identify:

\- Where the frame definitions and drawing functions live.  
\- How the available frame types are registered and selected.  
\- How frame geometry is calculated for the supported token shapes.  
\- How thickness, spacing, colours, highlights and backing are applied.  
\- How shadows, textures, bevels and decorative details are drawn.  
\- Which drawing functions are shared between frames.  
\- Which frames contain specialised drawing logic.  
\- Which existing settings could be exposed directly in a visual editor.

Create an inventory of all existing frames.

For each frame, describe its major visual components and classify it as one of the following:

1\. Straightforward to represent using reusable editable layers.  
2\. Suitable for a hybrid approach, retaining some specialised rendering functions.  
3\. Highly specialised and likely to require a custom renderer.

Do not claim that an internal component is independently editable unless the current code actually provides the information needed to edit it.

\#\#\# 2\. Investigate the renderer architecture

Determine how the current preview and export pipelines work.

Identify the safest way to reuse the existing frame renderer without breaking the current Token Maker website.

Investigate the coordinate system, scaling rules, clipping, supported shapes, rendering order, colour handling and any assumptions about frame geometry.

Identify any performance problems that could arise when rendering a complex design with numerous layers.

Explain how to preserve the current rendering behaviour, including consistency between previews and exported images.

\#\#\# 3\. Propose an editable artwork format

Design a versioned data structure called \`FrameDefinition\` or \`FrameProject\`.

It should eventually support:

\- Layers with unique IDs, names and visibility settings.  
\- Layer locking, ordering, duplication and grouping.  
\- Basic geometric shapes and editable paths.  
\- Fill and stroke properties.  
\- Repeated decorative elements.  
\- Procedural textures and other specialised drawing effects.  
\- Transformations, opacity, clipping and blend modes where supported.  
\- Parameters and defaults for individual layer types.  
\- Compatibility with specialised legacy frame renderers.

The structure should be expressive enough for intricate procedural artwork but simple enough for a visual editor to generate and edit.

Explain which layer types should be supported in the initial version and which should be deferred.

Do not implement the schema yet. Present the proposed structure and its trade-offs first.

\#\#\# 4\. Plan how existing frames will become templates

I do not expect arbitrary drawing code to become independently editable automatically.

Propose a gradual migration strategy that allows existing frames to work as templates from the beginning.

Initially, an existing frame may need to be represented as a legacy renderer layer with its current settings exposed.

Over time, we should be able to convert its internal components into independently editable layers without having to rewrite the entire application.

Explain how to handle frames that require specialised procedural drawing functions.

Preserve the original appearance of the existing frames wherever possible.

\#\#\# 5\. Design the editor architecture

Recommend an architecture for a Frame Studio interface that fits the existing project.

The intended interface includes:

\- A central live preview canvas.  
\- A layers panel.  
\- A properties panel for the selected layer.  
\- Tools for adding and editing graphical elements.  
\- Basic and Advanced editing modes.  
\- Undo and redo.  
\- Saving and loading projects.  
\- Importing and exporting reusable artwork definitions.

The interface should be usable by someone who cannot code.

Prefer the project's existing libraries and architecture where sensible. Recommend additional dependencies only where they provide a clear benefit.

Keep the editor modular so that its interface, data model, renderer and storage can evolve independently.

\#\#\# 6\. Recommend an incremental implementation plan

Divide the project into small, independently testable phases.

The first working version should support existing frame templates, their available settings, a basic editable layer system and saving/loading an artwork definition.

Later phases can add more sophisticated drawing tools, procedural effects, expanded template conversion and advanced editing.

For each phase, specify:

\- Its objective.  
\- The files likely to change.  
\- The required functionality.  
\- Tests and acceptance criteria.  
\- Dependencies on earlier phases.  
\- The most significant risks.

\#\#\# 7\. Quality requirements

The existing Token Maker website must continue to work.

Do not replace the existing renderer wholesale when extending it would be safer.

Do not introduce a second, inconsistent rendering pipeline for previews and exports.

Recommend tests that verify the existing frames continue to render correctly, as well as tests for the new layer system.

Where practical, propose visual regression tests comparing the original and converted frames.

\#\#\# Deliverable

Return a practical, plain-English report with:

1\. A map of the relevant source files and their responsibilities.  
2\. An inventory and classification of the existing frames.  
3\. A proposed artwork data model.  
4\. A recommended architecture for the visual editor.  
5\. A staged implementation plan.  
6\. A list of decisions requiring my attention, with your recommended default for each.

I am new to programming, so explain technical trade-offs clearly. I will use this report to decide how to proceed before you modify the code.

Do not begin implementation during this phase.

### **What to do with the audit**

Read the resulting report before proceeding.

You don't need to understand every technical detail. The important questions are whether Claude has located the existing frame renderers, whether its proposed data format can represent different types of artwork, and whether its plan preserves the existing site.

If Claude proposes replacing the whole renderer, rewriting all the borders immediately or creating an entirely separate graphics engine without explaining why, I'd ask it to reconsider.

The objective is to extend the existing application rather than accidentally develop two competing systems.

---

## **Prompt 2: Build the first working version**

Once the audit is complete, the next prompt should implement a deliberately small but useful version of the editor.

I'd initially put Frame Studio inside the existing repository, on a separate route such as `/frame-studio`. That gives it direct access to the current rendering code and makes it easier to test against the existing site.

If the tool eventually warrants a separate website, you can extract it into its own project once the architecture is established.

The following prompt assumes the architecture audit has been completed. Have Claude use its findings to determine the correct source files and adapt the implementation to your actual repository.

\# Frame Studio — Phase 1 Implementation

Using your completed architecture audit and the existing project documentation, implement the first working version of Frame Studio.

Read the audit recommendations and current repository documentation before making changes. Follow the existing project's architecture and coding conventions wherever appropriate.

This phase should produce a working visual editor, not merely a mock-up or a static demonstration.

Do not attempt to implement every possible drawing feature. Prioritise the core architecture, working controls and a reliable end-to-end editing workflow.

\#\# 1\. Add the Frame Studio interface

Add a dedicated Frame Studio route to the existing website.

Do not disrupt the existing token editor.

The new interface should include:

\- A central canvas displaying a live preview of the selected frame.  
\- A panel listing the artwork's layers.  
\- A properties panel for editing the selected layer.  
\- Controls for adding supported layer types.  
\- An expandable Advanced section.  
\- Undo and redo controls.  
\- New, save, open and export actions.

Use the existing design language where appropriate, while making the interface feel like a dedicated graphics editor.

Keep the interface usable on common desktop screen sizes. Design the component structure so that touch-friendly interaction can be added without rewriting the editor.

\#\# 2\. Create the artwork data model

Implement the versioned artwork format agreed in the architecture audit.

The editor must manipulate structured artwork data rather than storing all the artwork in source code.

Use stable layer IDs and predictable defaults.

Changes to the artwork definition must produce a new render.

Keep the artwork definition separate from the interface and rendering code.

Do not use arbitrary JavaScript evaluation to render user-supplied artwork. Layer definitions must be interpreted by the application's own renderer.

\#\# 3\. Integrate the existing frames

Allow the user to browse and select all existing code-drawn frames.

Display a thumbnail or live preview of each frame.

Selecting a frame should load it into the editor without changing the original frame definition or breaking its appearance.

Initially, where necessary, represent an existing frame as a legacy renderer layer. Expose the existing settings that are safe and meaningful to edit.

Do not falsely present an existing composite frame as a collection of independently editable components when it has not yet been converted.

Preserve the current drawing implementation wherever practical.

Use a shared rendering pipeline rather than creating an unrelated renderer that only looks similar.

\#\# 4\. Implement the first editable layer types

Start with a small, well-designed set of reusable layer types.

Prioritise:

\- Basic shapes.  
\- Filled shapes with outlines.  
\- Simple editable paths, if practical within the existing architecture.  
\- Repeated decorative elements distributed along a circular or other supported path.  
\- Simple colour and gradient settings.

The architecture should permit more layer types to be added later without rewriting the editor.

Every supported layer type must have a clear set of editable properties and sensible default values.

Repeated elements should be particularly easy to configure: users should be able to change their count, size, spacing, rotation and colour without editing each instance separately.

Users should be able to create a basic custom design by combining an existing frame with the supported editable layers.

\#\# 5\. Build the layer interface

The layers panel should support:

\- Selecting a layer.  
\- Renaming it.  
\- Showing or hiding it.  
\- Locking it against accidental editing.  
\- Reordering it.  
\- Duplicating it.  
\- Deleting it.

The properties panel must change according to the selected layer type.

Use ordinary UI controls for common properties. Put advanced numerical settings in an expandable Advanced section.

Do not expose code as a requirement for normal editing.

Where an advanced code or data view is appropriate, make it optional and ensure the rest of the editor remains usable without it.

\#\# 6\. Build the rendering and interaction workflow

The preview should update as the user edits the artwork.

Use a consistent coordinate system so that saved artwork remains correctly positioned and scaled.

Support the existing frame geometry and rendering constraints identified in the audit.

Where possible, allow supported elements to be selected and manipulated directly on the canvas.

Ensure that changing the layer order changes the rendered result predictably.

Implement undo and redo using the application's structured artwork state, not by taking screenshots.

Do not sacrifice output quality for the sake of preview speed without establishing a clear distinction between preview rendering and final rendering.

\#\# 7\. Saving and exporting

Implement the project's save and load workflow.

Use an appropriate browser storage mechanism for autosaving the current project, subject to the existing architecture.

Allow users to export their artwork definition as a versioned JSON file and import it again.

An exported and subsequently imported project must retain its layer settings and reproduce the same artwork.

Keep the artwork definition portable and independent of unnecessary application-specific state.

If a feature requires assets or capabilities that are not yet supported by the format, handle this explicitly rather than silently discarding information.

\#\# 8\. Preserve the existing Token Maker

Do not break the existing token editor, its saved settings, its border selection controls or its image export.

Do not change the appearance of existing frames unnecessarily.

If the new editor requires a significant change to the renderer, implement it incrementally and document the compatibility implications.

Do not convert every existing frame in this phase.

Instead, establish the architecture needed to convert them gradually.

\#\# 9\. Tests and acceptance criteria

Add appropriate automated tests for the new functionality.

At minimum, verify that:

\- The existing frame catalogue loads.  
\- Existing frames render successfully.  
\- Selecting a frame displays the correct design.  
\- Editing a supported layer changes the preview.  
\- Layer visibility and ordering work.  
\- Duplicating and deleting layers work.  
\- Undo and redo restore previous artwork states.  
\- Exporting and importing a project preserves its definition.  
\- The existing Token Maker continues to pass its relevant tests.

Check the rendered appearance of representative existing frames against the original implementation.

Run the available tests and report any failures. Do not claim that tests passed unless you actually ran them.

\#\# 10\. Development workflow

Implement this phase as a coherent, testable increment.

You may reorganise code when genuinely necessary, but avoid broad refactoring unrelated to this feature.

Do not introduce substantial dependencies without explaining why they are needed.

Keep the code readable and modular.

Update the relevant documentation and progress checklist when the phase is complete.

At the end, provide:

1\. A plain-English summary of what is working.  
2\. The main files created or changed.  
3\. Tests run and their results.  
4\. Any unfinished features or known limitations.  
5\. Simple Windows PowerShell instructions for running and testing the editor.

Do not describe a feature as complete if it is only partially implemented.

The goal is a working foundation that we can extend in subsequent phases.  
---

# **6\. How I'd continue prompting after that**

The first version shouldn't attempt to reproduce Photoshop. It should establish the underlying system and demonstrate that layers can be combined and edited successfully.

After Claude Code finishes Phase 1, I'd work through the next few phases with separate prompts.

| Phase | Objective | Expected result |
| ----- | ----- | ----- |
| 1 | Foundation | An editor that loads existing borders, edits supported properties and combines them with basic new layers |
| 2 | Drawing tools | Better path editing, shape creation, duplication, transformations and reusable decorative elements |
| 3 | Procedural effects | Textures, repeating patterns, engraving, bevels, complex materials and other procedural effects |
| 4 | Template conversion | Existing borders are progressively broken down into independently editable components |
| 5 | Polish | Advanced controls, robust saving, project sharing, improved usability and broader export options |

The prompts should always refer back to the existing project documentation, the artwork schema and the acceptance criteria from previous phases.

That prevents Claude from inventing a new architecture every time you add a feature.

I'd also ask it to maintain a short progress document that records what works, what has not been implemented, which technical decisions have been made and what the next phase should accomplish.

This will be particularly valuable when you return to the project after a break.

## **One additional feature I'd prioritise**

I would build a **reusable layer library** relatively early.

Imagine having a collection of individual elements extracted from your existing borders:

* A collection of metallic rims and bevels.  
* Several styles of magical runes.  
* Gems, rivets and decorative studs.  
* Woodgrain, stonework and engraved textures.  
* Leaves, chains, skulls and other fantasy motifs.  
* Glows, flames and other effects.

You could add one of these elements to any frame, adjust its appearance and save your modified version for future use.

This is where the tool would become significantly more powerful than a conventional border editor. You wouldn't be restricted to the designs you originally programmed. You'd have a growing collection of reusable procedural artwork that could be combined in new ways.

It would also make future development more manageable: once an element is implemented properly, users could reuse it in hundreds of designs without needing a separate drawing function for every combination.

---

# **7\. A few technical decisions I'd make now**

There are three choices I'd settle early because they will affect how easy the application is to develop and maintain.

**First, keep the editor's internal representation independent of its user interface.** A layer should be defined by its data and rendering behaviour, not by the particular controls used to edit it. That way, adding a new layer type won't require rebuilding the whole interface.

**Second, preserve existing rendering functions as long as they remain useful.** A specialised procedural effect doesn't have to be converted into basic vector shapes just to fit the layer system. Some advanced layers will work best as dedicated rendering functions with a carefully designed set of editable parameters.

**Third, establish visual regression tests early.** Your existing borders are finished artwork, so their appearance matters. A test suite that compares representative renders against reference images will help catch accidental changes as you refactor them. The existing project documentation already recognises the importance of renderer testing and visual checks. [GitHub](https://github.com/GroudonMcL/token-maker/blob/main/docs/DESIGN.md)

I'd also keep the artwork format versioned from the outset. If you later add new layer types or properties, you want older saved projects to continue opening correctly.

## **My recommendation**

**Start with the architecture audit prompt, then build the first version of Frame Studio inside your existing Token Maker repository.**

Don't begin by trying to convert all 27 borders, build every drawing tool or implement an unrestricted code editor. Get the underlying layer system working first.

Once you can load an existing border, add a decorative element, change its properties, save the design and reproduce it reliably, you'll have established the difficult foundation. From there, you can expand the drawing tools and progressively convert the existing borders into fully editable templates.

Most importantly, this approach lets you start creating new designs before the entire system is finished. You can build the tool around the way you actually want to work, rather than having to understand programming before you can make the artwork.


# ❄️ C.C.'s Journey — AI Agent Simulation & Evolution

A modern, interactive web simulation built with JavaScript (ES6+) and HTML5 Canvas demonstrating the step-by-step evolution of an **Artificial Intelligence Agent** through temporal abstraction levels.

Inspired by **C.C.** (*Code Geass*), the agent navigates a **10×10 frozen forest grid** to collect scattered mirror fragments and restore them to a central altar.

---

##Temporal Agent Evolution

This project demonstrates the transition of AI decision-making across three temporal states (**t**):

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   t-1: PAST     │ <---> │   t0: PRESENT   │ <---> │   t+1: FUTURE   │
│ Memory & Graphs │       │  Simple Reflex  │       │ Goals & Pathing │
│  [Coming Soon]  │       │  [IMPLEMENTED]  │       │  [Coming Soon]  │
└─────────────────┘       └─────────────────┘       └─────────────────┘

🟢 Level t₀ — Present: Simple Reflex Agent (Current Phase — COMPLETED)
The agent operates strictly under the Condition → Action paradigm: A₀ = f(P₀). It has no memory of past steps nor future planning capabilities; it reacts exclusively to its current sensor perceptions in real time.

Key Features Implemented
10×10 Grid Environment: Dynamically generated map featuring 10 mirror fragments and a central altar/base.

Perception - Action Cycle:

On Fragment: Collects the fragment immediately.

On Base + Carrying Fragment: Deposits the fragment to restore the mirror.

On Base + Incomplete Energy: Remains at the altar to recharge (+20% per cycle).

Default State: Explores the grid using a Random Walk.

Energy Management System: Percentage-based energy drain per move. Reaching 0% causes the agent to become stranded ("Out of Energy").

UI/UX Control Panel:

Live sidebar tracking current state (Sleeping, Searching, Recharging, Stopped).

Dynamic energy bar with color thresholds (Green / Yellow / Red).

Neon Start and Stop buttons to control simulation execution.

Procedurally rendered pixel-art sprites with dark-mode frozen forest themes.


Project Structure
.
├── index.html          # Canvas layout and UI panel structure
├── styles.css          # Retro/neon styling and background themes
├── main.js             # Main simulation loop and UI event listeners
├── mapa.js             # Grid logic and fragment spawning
├── agente.js           # Reflex agent decision-making logic
├── snowy-mountains.jpg # Main environment background
└── snowy-forest.png    # Status panel background image










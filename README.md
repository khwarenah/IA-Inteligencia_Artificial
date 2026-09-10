# C.C.'s Journey — AI Agent Simulation & Evolution

This project is an interactive platform built with JavaScript and HTML5 Canvas that simulates the decision-making process of an **Artificial Intelligence Agent**.

Inspired by the character **C.C.** (*Code Geass*), the agent navigates a $10 \times 10$ frozen forest grid to collect 10 scattered mirror fragments and restore them to the central altar.

---

## Temporal Agent Evolution

The project explores the evolution of the agent's behavior across three temporal abstraction levels ($t$):

```text
 [ t-1: Past ]    <--->    [ t0: Present ]    <--->    [ t+1: Future ]
(Memory / Graph)         (Simple Reflex)           (Goals & Planning)
  [Coming Soon]            [In Progress]              [Coming Soon]

Level t0 — Present: Simple Reflex Agent (Current Phase - In progress)
The agent operates strictly under the Condition $\rightarrow$ Action paradigm: $A_0 = f(P_0)$. It possesses no memory of past steps nor future planning capabilities; it reacts solely to what its sensors perceive on the current cell at the present moment.

Implemented Features:
10x10 Grid
Environment: Dynamic board generated with 10 mirror fragments and a central base/altar.
Perception - Action Loop:On a Fragment: Collects it immediately.
On Base with a Fragment: Deposits it to restore the mirror.
On Base with Incomplete Energy: Remains at the node to recharge progressively (+20%per cycle).
Default Action: Explores the map using a random walk.
Energy Management: Percentage-based energy depletion per step. If energy reaches 0%, the agent becomes stranded ("Out of Energy").
UI/UX Controls & Dashboard:Real-time sidebar displaying current status (Sleeping, Searching, Recharging, Stopped).
Dynamic energy bar that changes color based on battery levels.
Native Pixel Art sprites rendered entirely via code arrays with an immersive frozen forest background.




# NaVILA weight editing: method, results, and limits

Independent pilot · 6 November 2026 · R2R-CE / Habitat

**The edit produced modest navigation-quality gains on this fixed subset, but did not demonstrate faster successful navigation.** The preselected combined edit improved success from 24/50 to 27/50 and stopping within 1 m from 15/50 to 17/50. Average queries across all episodes fell by 12.25%; among the 23 episodes successful under both policies, queries increased by 9.90%. Forward commands did not become longer.

## Aim and adaptation

We tested three targets: longer appropriate straight actions to reduce decision overhead, more precise stopping, and higher navigation success. The workflow was inspired by [Robotics Weight Editing](https://cuzyoung.github.io/robotics-weight-editing/): formulate a behavioral intervention, fit a localized weight change without backpropagation, save it into a checkpoint, and evaluate closed-loop behavior.

This is an independent adaptation, with no claim to reproduce the original manipulation experiments. It edits NaVILA's text-action output head and uses no temporal RoPE scaling. NaVILA expresses navigation actions as language commands; its architecture is described in the [official project](https://navila-bot.github.io/) and [paper](https://navila-bot.github.io/static/navila_paper.pdf).

## What was edited

We used the NaVILA Llama-3 8B, 8-frame model. Only five rows of its language-model output head were editable: the tokens `I`, `The`, `25`, `50`, and `75`. The first two distinguish the model's native STOP and continue response openings; the other three represent forward distances. Each fixed weight change affects logits through the current hidden state, so its effect varies with context.

Forward passes supplied hidden features. We constructed bounded logit-margin corrections toward annotated decisions, with zero-change targets at ordinary answer positions to preserve behavior. Weighted ridge regression fitted the residuals. There was no backpropagation, gradient optimizer, LoRA, or runtime logit processor. The distance objective reinforced annotated 25/50/75 cm choices, with a larger target margin for 75 cm; it did not directly optimize completion time or learn a separate safe-distance predictor.

Fitting used **480 training states** and selection used **160 development states**, all drawn from R2R training data. We took at most one state per physical trajectory. Fitting and development were separated by scene, covering 47 and 11 sampled scenes respectively, with no overlap with the seven test scenes.

Nine declared candidates combined three ridge fractions (0.001, 0.01, 0.1) with three strengths (0.25, 0.5, 1). Development safeguards checked STOP false positives, full-vocabulary decision accuracy, and changes to ordinary answer-token predictions. The selected combined edit used ridge fraction 0.01 and strength 1. It passed the safeguards; selection never used the evaluation episodes.

After FP16 merging, **20,474 weight entries** changed: approximately **0.000241% of 8.494 billion total parameters**. The update's L2 norm was **41.6% of the original five-row L2 norm**. A small global parameter fraction therefore does not imply a small local perturbation. Native edited checkpoints were exported and evaluated through the same inference code; original-weight preservation and edited-file checksums were verified before and after evaluation.

## Frozen evaluation

The test set was the **first 50 episodes in the original `val_unseen` JSON array**, before scene grouping, sorting, or sharding. It spans seven scenes. Baseline, STOP-only, distance-only, and combined each completed those same 50 episodes: **200 closed-loop runs**, with no execution errors.

All variants shared the observation sampler, prompt, greedy decoding, 25 cm / 15° primitives, seed 100, and 500-primitive-step budget. STOP-only and distance-only retained two and three rows of the same selected patch, respectively. They were attribution ablations, with no refitting or test-based model selection. The combined edit remained the prespecified primary result.

| Metric | Baseline | STOP-only | Distance-only | Combined |
|---|---:|---:|---:|---:|
| Success: STOP within 3 m | 48% (24/50) | 46% (23/50) | 54% (27/50) | 54% (27/50) |
| SPL | 0.4558 | 0.4412 | 0.4965 | 0.5028 |
| nDTW | 0.6361 | 0.6376 | 0.6625 | 0.6670 |
| Terminal navigation error, m | 5.669 | 5.685 | 5.309 | 5.251 |
| Explicit STOP at ≤1 m | 30% (15/50) | 28% (14/50) | 34% (17/50) | 34% (17/50) |
| Explicit STOP at ≤0.5 m | 10% (5/50) | 10% (5/50) | 16% (8/50) | 12% (6/50) |
| Mean model queries | 35.60 | 35.10 | 32.06 | 31.24 |
| Mean primitive steps, including STOP | 81.94 | 80.94 | 73.56 | 72.02 |
| Mean forward command, cm¹ | 70.00 | 70.19 | 69.24 | 69.81 |

Success uses a strict distance threshold of less than 3 m. Both stricter stopping rates use all 50 episodes as their denominator. ¹Forward-command length is averaged within each episode and then across episodes; commanded length is not actual displacement.

## Why fewer average queries do not establish speedup

Combined queries fell from 1,780 to 1,562 overall. Their complete paired decomposition is:

| Outcome under baseline → combined | Episodes | Baseline queries | Combined queries |
|---|---:|---:|---:|
| Success → success | 23 | 525 | 577 |
| Failure → failure | 22 | 1,100 | 814 |
| Failure → success | 4 | 131 | 150 |
| Success → failure | 1 | 24 | 21 |

The overall reduction came mainly from episodes that still failed. On common-success episodes, mean queries rose from **22.83 to 25.09**, and primitive steps rose from **1,266 to 1,379** in total. Mean forward commands changed from **70.00 to 69.81 cm**. The intended mechanism of longer straight actions producing faster successful navigation was not demonstrated.

STOP-only is a useful negative result: success fell to 23/50 and stopping within 1 m to 14/50. Improved offline STOP recognition did not ensure better closed-loop outcomes. Distance-only matched the combined edit's success and 1 m stopping rates and exceeded its 0.5 m stopping rate. All ablations are reported; the test was not used to select a replacement winner.

## Uncertainty and scope

We used 10,000 paired episode bootstrap resamples, seed 20261106. For combined minus baseline, the exploratory 95% intervals were:

- Success: **+6 percentage points**, interval **[−2, +16]**.
- Stopping within 1 m: **+4 percentage points**, interval **[−6, +14]**.
- Mean queries: **−4.36**, interval **[−11.38, +1.40]**.

The success comparison had four gains and one loss; exact two-sided McNemar p=0.375. These findings do not establish a reliable success improvement across the full benchmark. The fixed first 50 episodes are a small, nonrandom subset; shared scenes can make episode-bootstrap intervals too narrow. Multiple comparisons were not corrected, and teacher-forced development diagnostics are not closed-loop performance measurements.

This was a Habitat navigation experiment, with no physical robot-speed measurement. Inference and rollout wall times were recorded separately; rollout already includes inference. Concurrent evaluation and GPU differences also limit timing comparisons. The supported conclusion is a working native weight-editing pipeline with promising but uncertain quality changes, an informative STOP-only regression, and **no demonstrated successful-task speedup**.

Reference implementation of the base model: [official NaVILA repository](https://github.com/AnjieCheng/NaVILA).


## First-person before/after video replays

The website includes all four gained-success cases: episodes 6, 19, 21 and 22. Each comparison places the baseline on the left and the frozen combined edit on the right. Frames are real Habitat RGB rendered by replaying the original logged primitive actions with the same frozen scene configuration, start pose and seed. The original evaluation did not save video, so these are action-log simulation replays, not original-time recordings. The policies were not rerun or changed to make these videos.

Every replay state, including the initial state and final STOP, is checked against the recorded position and geodesic goal distance. Final outcomes and metrics are checked too. This verifies agreement with the logged behavior; it does not establish pixel identity with unsaved original observations.

Both sides advance at 5 primitive steps per video second. A completed side holds its final frame and is labeled STOPPED / FRAME HELD. The clips therefore compare behavior, not wall-clock inference time or robot speed. All four examples were selected because they changed from failure to success; the complete evaluation and its lost-success case remain visible elsewhere on the page.

The [replay audit](videos/replay-audit.json) records checksums, media properties and numerical replay checks.

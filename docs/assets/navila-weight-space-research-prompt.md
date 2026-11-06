# Research task: weight-space editing for NaVILA navigation

## Question

Can you improve a pretrained NaVILA navigation policy by understanding and directly editing its internal weights?

Investigate three outcomes: successful navigation, accurate stopping, and efficient completion. Prefer improvements that preserve the other outcomes. Longer forward commands are one possible mechanism, not the objective itself. A robot that stops early or fails sooner has not become a faster successful navigator.

Start from the original checkpoint and its native vision–language action interface. Discover the relevant failure and intervention rather than assuming a layer, token, direction, or editing algorithm in advance.

## Research approach

Use the autonomous investigation spirit of Robotics Weight Editing and the mechanism-led direct editing approach of the Weight-Space Programming language-model experiment. This run deliberately adopts a stricter protocol than gradient-free supervised fitting.

1. Understand the architecture and execution path. Trace observations, history sampling, prompt construction, generated actions, action parsing, queued primitives, and STOP. Separate model inference time, simulator execution, and end-to-end rollout time.
2. Study representative training-split behavior. Identify a recurring, measurable failure or inefficiency. Explain what evidence would falsify your diagnosis. A runtime defect must be reported as a runtime defect rather than credited to weight editing.
3. Inspect relevant weights and activations. Form a small number of explicit internal-mechanism hypotheses. Correlation with a correct action is insufficient evidence.
4. Intervene causally. Compare the same inputs before and after targeted changes and examine a few declared intervention strengths. Temporary activation interventions are diagnostic controls only. The final effect must survive an actual weight edit and ordinary checkpoint reload.
5. Confirm the selected edit on unused training scenes, then freeze it for a separate final evaluation. Record unsuccessful hypotheses as well as successful ones.

## Allowed and excluded operations

Allowed: reading model tensors; forward inference; activation inspection; matrix and spectral analysis; hand-specified sparse or low-rank internal tensor changes justified by a mechanism; small, declared dose-response checks; component removal and norm-matched random controls.

Excluded in this run: backpropagation, autograd gradients, optimizers, LoRA, supervised regression or least-squares fitting to examples, distillation, iterative loss fitting, and automatic black-box parameter optimization. Do not reuse a prior fitted patch or feature cache.

Keep input embeddings, the language output head, final normalization, tokenizer, model configuration and architecture unchanged. Do not use whole-tensor scalar multiplication as the intervention. Investigate internal attention/MLP components without prescribing which one must change. These are explicit constraints of this experiment, not a universal definition of all weight-space editing.

Production inference must retain its original observation sampler, prompt, decoding, action parser, primitive sizes, action queue and episode limit. No runtime hooks, logit processors, added controllers, hardcoded navigation rules, or episode/scene-specific branches may remain in the evaluated policy. Changing action text after generation does not count as a weight edit.

## Evidence and data separation

Use original R2R training data only for discovery and selection. Before editing, freeze scene-disjoint discovery, selection and confirmation subsets, with no duplicate physical trajectories across subsets. These subsets are held out from this editing process, not necessarily from base-model pretraining. Log checksums and sampling rules.

Do not inspect validation episodes, their outcomes, earlier test analyses, previously edited checkpoints, or public experiment results while designing the new edit. A separate evaluator will handle the test set after selection is locked. It is the same first 50 raw-order val_unseen episodes used in an earlier public pilot, so the final comparison is an exploratory retest, not a newly blinded benchmark.

Before candidate measurements, state the selection rule and preservation conditions. Compare baseline and candidates on the same episodes and seeds. Prefer a candidate that improves at least one target without observed degradation in success, precise stopping or common-success efficiency. If the evidence is weak, report uncertainty. Do not assert that a candidate is effective merely because it has the highest noisy point estimate.

The confirmation subset is used once after selection; it does not start another tuning cycle. If no supported edit survives, report a negative result. You may freeze the best scientifically justified diagnostic candidate for the final comparison if it is explicitly labeled unvalidated or rejected; never present it as an accepted improvement or make an arbitrary patch just to produce a checkpoint.

## Measurements

Report, separately:

- Success: explicit STOP at geodesic distance <3 m; SPL, nDTW, final and minimum goal distance.
- Stopping: explicit STOP within 1 m and 0.5 m, over all episodes; premature stops and timeouts.
- Efficiency: model calls, primitive steps, path length and collisions. Report paired changes on episodes both policies succeed on, as well as all episodes and changed-success groups. Forward-command length alone is not a speed metric.
- Timing: inference and total rollout wall time with hardware/load context. Rollout time includes inference. Habitat measurements do not establish real-robot motion speed.
- Edit: tensor names and shapes, exact construction, actual changed FP16 entries, relative and absolute norms, and runtime overhead.

For each hypothesis, record its prediction before the intervention, the observations, alternative explanations, decision to retain/reject, and artifact paths. Keep concise research notes and machine-readable budget/candidate records.

## Execution budget and artifact integrity

For this bounded pilot, use at most 50 diagnostic batches (at most 32 navigation contexts per batch), four candidate edit families, 96 total training-split closed-loop episodes including baselines/controls, and 4,096 total model action-generation calls. Count work across variants and retries. Stop discovery at the first applicable limit or six hours. The locked final evaluation is separate. Do not silently change a budget or redefine what counts as a call.

Use only allocated idle GPUs and do not interrupt other jobs. Write to a new experiment directory. Preserve the original model, source tree and earlier outputs. Hash original weights/configuration, export edited tensors into a separately loadable checkpoint, verify untouched tensors, and check the original again after evaluation. Save patches with checksums and enough information to reconstruct and remove them. No physical-robot execution is part of this task.

## Deliverables

Produce a diagnosis backed by measured evidence; an explicit hypothesis and causal/dose-response probes; an edit construction script and patch, if justified; a native checkpoint export and verification report; train-only selection and one-time confirmation records; the frozen final candidate manifest; and a concise report covering all tested hypotheses, regressions, costs and limitations.

The goal is a defensible answer about whether a specific navigation failure can be repaired in internal weight space. A clear negative result is preferable to an unsupported claim of acceleration.

## References

- Robotics Weight Editing: https://cuzyoung.github.io/robotics-weight-editing/
- Its original research prompt: https://cuzyoung.github.io/robotics-weight-editing/assets/source/original-research-prompt.txt
- Sparks of Weight-Space Programming: https://rikiyat.github.io/blog/weight-space-programming/
- Qwen experiment protocol: https://raw.githubusercontent.com/RikiyaT/lm_understand-logs/main/exp8_math/runs/p50c/turns/t001/prompt.txt

This is a new navigation-specific protocol inspired by those sources; it is not their original prompt or a reproduction of their reported results.

s# **PART I. QUANTIZATION \- THE HIDDEN DEFECT**

# **1\. Introduction — Same Label, Different Model**

Picture a lead engineer at a major AI provider, staring at a dashboard of inference costs. The new "LegalEagle" model is powerful and massive. Running it at full precision—16-bit floating point—requires expensive, high-end GPUs. Every token burns cash.

So she turns a dial. She compresses the model's weights from 16-bit to 4-bit integers. This is quantization. The model shrinks instantly. It runs faster. It costs far less to operate.

On the surface, nothing has changed. The model still speaks perfect English, still sounds confident, still cites cases with the authoritative tone of a senior partner. But inside the neural network, compression has clipped rare, high-magnitude outlier weights—the directions that support complex, multi-step reasoning. The model has retained its vocabulary but lost part of its judgment.

The effect is like cutting the black keys and upper octaves off a piano: the instrument still plays smooth melodies, but its harmonic range has vanished.

The vendor ships this 4-bit model to law firms under the same name: "LegalEagle2.0." Same label, different instrument. The lawyers think they are buying a high-fidelity tool; they are renting a cost-optimized variant in professional packaging.

But they have no way of knowing. Once a legal team integrates a model through a stable name and endpoint, the interface remains constant even when upstream actors silently swap precision tiers or routing policies. The lawyer sees fluent outputs and a familiar label—not the precision configuration that determines whether the system can perform the complex reasoning she expects. The safety-relevant variable is hidden at the moment of reliance.

We call this _nominal equivalence_: the practice of concealing material quality differences under identical branding identifiers. It creates an observability problem for end-users but serves as a marketing strategy for model providers.

This Article argues that when the model fails—when it misses a critical exception, collapses a multi-part test, or inverts a burden of proof—many of these failures are not random hallucinations but foreseeable consequences of a design choice. The contribution is this: a particular class of legal-reasoning failures is configuration-linked, foreseeable, and often undisclosed—and should not be dismissed as inevitable "AI weirdness." When precision tier is treated as a material product specification and **verification is structurally unavailable at the moment of reliance**, these failures implicate familiar doctrines—design defect, failure to warn, warranty, and misrepresentation.

This Article does not claim that all model errors are product defects. It targets failures traceable to undisclosed precision-tier decisions in professional-grade legal deployments, where users cannot realistically audit or control the configuration. The problem is not that the model can be wrong; it is that the system architecture makes determining "how wrong" both upstream-controlled and practically unobservable at the moment it matters.

## **The Hidden Defect**

Vendors shipping legal AI systems make a deliberate trade-off: they compress model weights from higher-precision formats (FP16/BF16, sometimes FP32) to INT8 or INT4 to cut costs and increase speed. In engineering terms, this is quantization. In practical terms, it means forcing a large numerical space into a small set of discrete buckets. The system remains fluent because the statistical regularities that produce polished prose are robust to compression. What degrades first is the capacity to sustain disciplined, multi-step constraints: tracking exceptions across steps, maintaining logical chains, preserving distinctions that legal reasoning treats as dispositive—_shall_ versus _may_, _must_ versus _may_, the difference between a general rule and a carve-out. The output sounds like a competent legal associate, but the underlying logical structure has deteriorated.

This Article terms the resulting pattern _Fluency–Reasoning Divergence (FRD)_: surface fluency remains intact even as the model's capacity for accurate, multi-step legal reasoning deteriorates. It calls that deterioration Reasoning Decay. Unlike stochastic hallucinations—probabilistic errors arising from training data limitations or sampling variability—Reasoning Decay is tied to a concrete deployment parameter. Hold architecture, prompts, and decoding constant: changes in bit-precision systematically shift legal-reasoning performance in predictable directions. The output continues to sound like a competent legal associate while the underlying logical structure drifts.

## **Scope and Structure**

Sections II–IV explain what quantization changes technically and why it produces Fluency–Reasoning Divergence, including distinct degradation channels in retrieval-augmented systems. Sections V–VI show how precision decisions become operationally opaque across the deployment pipeline, such that downstream professionals cannot observe or control the configuration at the moment of reliance. Sections VII–VIII translate that architecture into legal consequences and governance responses—disclosure, labeling, and auditable configuration practices—before a brief conclusion.

# **2\. Technical Reality: How Quantization Destroys Reasoning While Preserving Fluency**

Imagine a law library where every case is assigned to a shelf based on its legal concept. In a high-resolution system, the Torts section has narrow, clearly labeled shelves: one for ordinary negligence, another for gross negligence, a third for recklessness, a fourth for willful misconduct. They share an aisle—the same doctrinal vicinity—but they are distinct. A lawyer walking through knows exactly which shelf to pull from.

Now imagine the library decides to save space. Instead of four shelves, there is one: Negligence-Related Conduct. Every case that had its own precise location is now lumped in the same bin. When you ask for cases on gross negligence, the system reaches into the combined bin and pulls whatever is closest to hand. Sometimes it grabs the right case. Sometimes recklessness. Sometimes willful misconduct. The system cannot tell the difference—after consolidation, they all live at the same address.

For a lawyer, this would be catastrophic. The distinction between gross negligence and willful misconduct is not academic. In many jurisdictions, qualified immunity protects government officials from suits based on ordinary negligence, can be overcome by gross negligence, and disappears entirely against willful misconduct. Telling a client she cannot sue because the officer was "merely" grossly negligent—when the facts support willful misconduct—means the client loses a case she should have won.

The system did not retrieve the wrong area of law. It retrieved the right neighborhood but could not see the distinctions within it that determine whether your client has a claim.

That is how quantization operates. It will not confuse torts with contracts. But it could confuse torts with a doctrinal neighbor. And that is precisely the kind of error a lawyer might not catch—because the answer looks right. It is in the right doctrinal neighborhood. It cites real cases. It sounds authoritative. Only the fine distinctions have been erased.

This chapter explains the technical mechanisms behind this failure mode: why quantization selectively destroys reasoning while preserving fluency, and how that degradation manifests at the retrieval and generation stages of modern legal AI systems.

## **2.1 Quantization as a One-Sided Intervention**

Quantization itself is not pathological. In deterministic systems like high-frequency trading, quantization is genuine optimization: it compresses microseconds into milliseconds, letting systems enter and exit market positions ahead of competitors. Speed is the objective, not a tradeoff.

In generative legal systems, speed is one objective among several—and quantization is a one-sided intervention. It optimizes speed and cost (less memory, more throughput, cheaper inference) by cannibalizing the multi-step, structured cognition that legal analysis demands. And it does this while leaving surface fluency intact, making the model seem confident even as its reasoning deteriorates.

This is not speculation. Recent computer science research documents the effect.

Li et al. (2025) found that standard post-training quantization methods like AWQ and llama.cpp introduce up to 32.39% accuracy degradation on reasoning benchmarks while preserving greater than 95% of baseline performance on general text tasks.[^1] The model's ability to generate fluent language barely moved; its ability to reason degraded significantly. Liu et al. (2025) confirmed this pattern, showing that quantization below 8-bit weights or 16-bit activation creates "significant accuracy" risks, particularly for reasoning.[^2] Their data suggests INT8 is the danger zone; INT4 is functionally unsafe for complex logic.

Studies on 4-bit quantization variants show alarming results. A Red Hat study of 4-bit Llama variants found that quantized models recover 96–99% of baseline language scores with "no discernible differences" in typical use.[^3] These are the metrics vendors cite when claiming their tools are reliable. A 99% score on industry benchmarks sounds like a passing grade—and it is, for the tests administered. The problem is what those tests measure.

Jin et al. (2024) demonstrated that 4-bit quantized models maintain perplexity scores[^4] comparable to their non-quantized variants.[^5]

Read those findings together. The industry conducts tests where the light is good; surface fluency and inference speed become benchmarks. Those benchmarks become targets that quantized LLMs are built to hit. Recent research confirms the dynamic: models exhibit "eval-awareness," detecting benchmark formats and performing well on tests they have memorized, while failing to reproduce such results on novel reasoning tasks.[^6]

## **2.2 The Mechanism: Fragile Circuits and Clipped Outliers**

Why does quantization specifically target complex reasoning while leaving surface fluency intact?

Consider two law students preparing for the bar. One reads full opinions—holdings, dissents, procedural history, the exceptions where rules break. The other memorizes one-sentence flashcards of black-letter rules. On straightforward multiple-choice questions, both perform well. On a complex essay turning on a rare exception, the first spots the nuance; the second confidently recites the flashcard—and fails. Quantization pushes large language models toward the flashcard student.

Transformer models rely on activation outliers[^7]: rare, high-magnitude weight directions that track long logical chains, edge cases, and exceptions. Aggressive quantization forces tens of thousands of continuous values into a handful of discrete buckets. The extreme values—those encoding subtle distinctions—are rounded off into the same bins as their neighbors. The model keeps common patterns and frequent associations but loses many rare, exception-sensitive pathways. Like cutting the black keys and upper octaves off a piano: the instrument still plays smooth melodies, but the notes needed for richer harmony disappear first.

Prompting, in this light, is not motivational language but routing. Tokens like _let's reason step by step_, _proof_, or _as a careful lawyer_ push computation into regions of activation space where high-magnitude reasoning circuits are more likely to fire. When quantization clips those outliers, it does not merely lower peak accuracy; it makes routing brittle. Small changes in wording produce large swings in performance because prompts nudge the model across damaged activation boundaries. From the outside, this shows up as classic prompt sensitivity.[^8]

The damage is uneven across the architecture. Attention layers—roughly one-third of the parameters—do the routing work: deciding which tokens attend to which, and what to track over long contexts. Feed-forward layers—the remaining two-thirds—apply learned patterns to whatever the attention mechanism surfaces. Empirical work shows that attention layers are far more precision-sensitive under compression; feed-forward layers are comparatively robust.

For legal practice, the effect resembles a firm that lays off its senior partners while keeping the associates. The associates—the robust feed-forward layers—still produce polished, grammatically impeccable memos. But the strategic judgment that should guide their work—the precision-sensitive attention layers—is degraded. The wrong precedents are emphasized, dispositive distinctions missed, ill-fitting theories pursued. The work product looks like competent lawyering; the underlying judgment has been quietly hollowed out.

This is the mechanical core of FRD: a quantized transformer's architecture makes the circuits supporting legal reasoning fragile, while leaving the circuits supporting fluent legal language robust.

## **2.3 Two Channels of Degradation in RAG Systems**

The vulnerability described above exists in any transformer-based system. But modern legal AI adds another layer: Retrieval-Augmented Generation (RAG). Instead of relying solely on model parameters, RAG systems retrieve passages from a legal corpus and condition answers on those materials. RAG is often presented as a remedy for hallucinations—the system "looks things up" rather than generating from memory. But quantization can corrupt the RAG pipeline at two distinct points, each creating a different failure mode with different implications for detection and liability.

### **Channel 1: Retrieval Degradation**

The law library analogy that opened this chapter describes retrieval degradation in action. The technical mechanism is embedding quantization.

To scale legal search over large corpora, platforms compress vector embeddings—the mathematical representations encoding where each concept lives in semantic space. The continuous embedding space is partitioned into coarse cells, and each document is represented by its cell's centroid. Think of it as replacing precise street addresses with block-level coordinates: 1247 Oak Street and 1249 Oak Street both become "1200 block of Oak." For most purposes, block-level precision works. But even if the law office at 1247 and the dental clinic at 1249 are legally distinct, the system cannot tell them apart. They share the same approximate address.

Jeong (2025) documented this effect directly: 4-bit quantization in vector embeddings causes measurable degradation in retrieval accuracy, with particularly severe impact on semantic similarity matching for nuanced queries.[^9]

The result is what this Article calls RAG Blindness: relevant cases never surface—not because they do not exist, but because the embedding space has lost the resolution to find them. The system is not dumb; it is architecturally incapable of seeing the distinctions that matter.

Conceptually, retrieval degradation is like a lawyer whose eyesight has deteriorated: her reasoning remains intact, but if she cannot see the case reporter clearly, she will miss authorities in plain view. The flaw is in access to information, not in reasoning about information once perceived.

### **Channel 2: Generative Distortion**

Separately, operators quantize the generative model's weights—the parameters that synthesize retrieved documents into answers. Even if the RAG system retrieves the correct documents, the quantized generator may fail to synthesize them correctly.

Yazan et al. (2024) demonstrated this pattern: retrieval works, but quantized generators fail on long-context and complex synthesis tasks. The model cites the right case but misstates the holding, omits a critical exception, inverts the burden of proof, or flips _shall_ to _may_—because precision loss has damaged the circuits that track logical operators and exceptions across long passages.[^10]

Conceptually, generative distortion is like a lawyer whose eyesight is fine but whose judgment has failed: she reads the correct case, cites it accurately, and still misapplies the holding or drops a critical exception. Retrieval degradation is a database problem. Generative distortion is a reasoning defect—and, in legal practice, a much closer analogue to malpractice.

Return to the law firm analogy: this is like giving the compromised partners the correct case file—the associates retrieved exactly what was needed—but the partners still misread it. Retrieval succeeded. Reasoning failed anyway.

### **This Distinction Matters**

The liability implications of these two channels differ.

Retrieval Degradation produces observable failures. Missing citations, empty result sets, obviously incomplete surveys of authority—a careful lawyer might notice something is wrong. The system behaves like a confused research assistant who cannot find the file. Frustrating, but visible.

Generative Distortion is far more dangerous. It produces plausible, fluent answers built on corrupted reasoning. The lawyer sees the correct case cited. The language is confident and professional. The analysis looks right. Only the internal logic has been warped. The system behaves like a confident associate who found the file, read it, and misstated what it says.

This is where FRD reaches its most dangerous expression—not "no answer," but a subtly wrong answer that looks plausible to a busy practitioner under time pressure.

## **2.4 Citation Hallucination: A Case Study in Triple Vulnerability**

Legal citations occupy a unique position in the taxonomy of AI failure modes. They are vulnerable to quantization at every stage—retrieval, generation from context, generation from parametric memory—yet lawyers' mental models prepare them to detect only one of these failures.

### **The Lawyer’s Mental Model**

When a lawyer cites "347 U.S. 483," she has performed an act of reference. She looked up the case, confirmed the volume and page number, and transcribed it. The citation points to something that exists externally and independently. She either knows the citation or does not; if uncertain, she checks. Citation, in legal practice, is retrieval.

This mental model maps intuitively onto retrieval-augmented generation. The AI searches a corpus, finds the relevant case, reports what it found. If the citation is wrong, the lawyer's instinct is that the system looked in the wrong place—a database error, a search failure, an indexing problem. This is retrieval failure, and lawyers have intuitions about it. It resembles a research assistant who brings back the wrong case.

But language models do not cite by reference. They cite by generation. Generation is vulnerable in ways that retrieval is not.

### **Three Failure Modes**

#### **Failure Mode 1**

The document containing the correct citation never surfaces. Quantized embeddings have collapsed the semantic distance between neighboring concepts; the retrieval system cannot distinguish the controlling case from doctrinally adjacent alternatives. The model never sees "347 U.S. 483" because vector search returned a different case from the same doctrinal neighborhood. This is RAG Blindness applied to citations (the retrieval-channel degradation described in §2.3).

Lawyers can sometimes detect this failure. If the cited case is obviously off-topic, or if a known landmark fails to appear, the absence is visible. The system behaves like a confused research assistant who cannot find the file.

#### **Failure Mode 2 \- Generative Distortion from Context**

The correct document is retrieved. It contains "347 U.S. 483" in plain text. But when the model generates its response, it produces "347 U.S. 485." The source material was correct; the transcription was corrupted.

Citation generation is not copying—it is token-by-token prediction. The model does not read the citation and paste it. It attends to the relevant passage, encodes a representation, then generates output tokens by sampling from a probability distribution. The string "483" might have 72% probability, "485" 14%, "484" 8%. Under full precision, the highest-probability token usually wins. Under quantization, the probability landscape becomes noisier. Small perturbations in the attention weights—the same fragile circuits discussed in §2.2—can flip the ranking. A lower-probability but still-plausible token surfaces.

From the lawyer's perspective, this looks like a harmless typo. The case name is correct. The reporter is correct. The volume is correct. Only the page number is wrong—often by a digit or two. The lawyer applies a verification heuristic calibrated to human error (transcription mistakes, transposed digits) rather than machine error (probabilistic degradation of attention). The heuristic fails because the AI's failure mode mimics human sloppiness while arising from an entirely different mechanism.

#### **Failure Mode 3 \- Generative Fabrication from Parametric Memory**

No retrieval occurs. The model generates the citation purely from its weights—from what it "memorized" during training. This is common in non-RAG deployments and in RAG systems when retrieval returns nothing relevant.

Here the model is not transcribing a source; it is reconstructing a citation from compressed statistical patterns. The training data contained "347 U.S. 483" some number of times, and the model learned an association between the case name, the reporter, and the page number. Under full precision, that association may be strong enough to reproduce the citation accurately. Under quantization, the high-magnitude weights encoding this specific, rare fact—exactly the "outlier" weights described in §2.2—are clipped. The model retains the general pattern (a mid-century Supreme Court case, three-digit volume, three-digit page) but loses the precision to reproduce exact numbers.

The result is a citation that is almost correct: "347 U.S. 485" instead of "483." The model landed in the right neighborhood but lost the resolution to hit the exact address. Because the fabricated citation is structurally valid—correct format, real reporter, plausible range—it passes surface inspection.

### **Why Verification Fails**

Lawyers are trained to verify citations. But their heuristics assume retrieval-based failure modes. Check whether the case exists. Check whether it says what the brief claims. Check whether the citation format is correct.

These heuristics reliably catch Failure Mode 1 (wrong case retrieved) and sometimes catch Failure Mode 3 (wholly fabricated case). They almost never catch Failure Mode 2 (correct case, garbled page number), and they catch Failure Mode 3 only when the fabrication is gross—a case name that sounds too generic, a reporter that does not exist, a volume number outside the plausible range.

The most dangerous errors are subtle: real case, real reporter, real volume, wrong page. Or real case, slightly misstated holding. Or real case, correct holding, wrong year. These errors require not just checking that the citation exists, but comparing it character-by-character against a verified source—a level of scrutiny that eliminates any efficiency gain from using AI in the first place.

This is Fluency–Reasoning Divergence applied to citations. The citation looks right. It follows the correct format. It appears in a confident, well-structured paragraph. Only the underlying precision has been lost. The lawyer, applying heuristics designed for human research assistants, has no reason to suspect that quantization has quietly corrupted the tool's internal probability distribution.

# **3\. The Opacity Problem**

The preceding chapter showed how quantization degrades legal reasoning while preserving surface fluency. This chapter asks a different question: how industry practices and complex supply chains create visibility issues that allow defects to stay hidden as they move through the legal AI supply chain.

Picture a scenario where a law firm uses an AI system to review merger agreements for change-of-control provisions. The vendor, optimizing for cost, has deployed an INT4 model. Due to quantization-induced precision loss, the model cannot reliably distinguish between "change of control" and "change in control"—a distinction that determines whether a $50 million termination fee triggers. The model's response remains fluent. It cites the correct contract sections. It sounds authoritative. But it misinterprets the provision.

The firm relies on this analysis. The client loses $50 million.

How does a defect this consequential stay invisible? The answer lies in how legal AI systems are architected, deployed, and labeled. The subsections that follow trace five mechanisms—endpoint opacity, passive concealment, active override, nominal equivalence, and the impossibility of inspection—that together ensure practitioners cannot see, control, or even know to ask about the precision configurations driving their tools.

## **3.1 Structural Opacity (Vertical Axis): Who Controls the Parameter?**

Legal AI systems are not monolithic products. They are assembled from layers: infrastructure providers supply optimization toolkits (NVIDIA, Google), base-model providers train and quantize base models (OpenAI, Anthropic, Google), legal-tech vendors build practice-facing interfaces and RAG pipelines (Harvey, Clio, CoCounsel), and law firms consume the final output.

This is the vertical supply chain of control—the ladder of actors who have hands on the fidelity parameter. Any upstream layer can change the precision tier while the downstream lawyer sees only a constant interface, unable to observe or audit the decisions being made above.

### **3.1.1 Defect 1: The Water Main Problem**

The relationship between a law firm and an API endpoint is closer to a fixed utility connection than a continuously renegotiated contract. When building plumbing is connected to a municipal water main, a plumber opens the street, installs pipes, and confirms that water flows from the tap. After that, nobody periodically excavates to check whether the upstream water source has changed. As long as clear water comes out of the same faucet, occupants reasonably infer that nothing material has changed. Even if the utility quietly switches from a high-quality source to a cheaper one with more contaminants, the pipes, fixtures, and labels remain the same.

Quantized legal AI systems work the same way. A firm integrates with a base-model provider’s endpoint once. The authentication keys work. The responses are fluent. Thereafter, the continued availability of well-formed responses through that endpoint reasonably signals product continuity. But upstream, base-model providers can silently swap the underlying model from a high-precision FP16 graph to an aggressively quantized INT4 engine—without modifying the URL, the model identifier, the API schema, or the input/output data types. The faucet looks unchanged. The water quality has materially degraded.

### **3.1.2 Defect 2: The Float-Compatible Interface**

Technical note.[^11]

Google's TensorFlow Lite documentation describes the design philosophy explicitly: even when a model's internal computation is quantized to low-bit integers, "the input and output still remain float in order to have the same interface as the original float only model."[^12] The quantized model is a drop-in replacement. Nothing at the API boundary signals that the underlying computation has changed.

The effect is that a model running INT4 or INT8 internally presents the same data types to the outside world as a full-precision model. Developers building applications—and the legal-tech vendors building on those applications, and the lawyers using those products—see only what goes in and what comes out. Both look identical whether the model is high-precision or aggressively quantized. The abstraction layer that makes integration seamless also makes degradation invisible.

No one actively lies. The documentation is public. But the architecture is designed so that the default experience reveals nothing. Unless someone affirmatively digs into configuration files or deployment logs, the precision tier stays hidden. The concealment is passive—built into the interface rather than affirmatively communicated—but it is concealment nonetheless. From an engineering perspective, this is backward compatibility and good API design. From a legal perspective, it is a mechanism for concealing a material change in product characteristics from the parties who are regulated and liable.

### **3.1.3 Defect 3: Active Override**

The supply chain opacity problem is not just about vendors failing to disclose precision levels. The more damaging finding is that infrastructure actively defeats attempts to choose safer configurations.

NVIDIA's TensorRT—one of the most widely deployed inference optimization platforms—documents this explicitly. In its **implicit quantization** mode, the engine treats the network as a floating-point graph and then uses INT8 opportunistically to optimize layer execution time with developers having little control over when and where INT8 is used in this mode.[^13]

_But the critical point is what occurs when a developer attempts to enforce safety over lower bit compression._ TensorRT offers a flag called **kSTRICT_TYPES** that is supposed to lock in specified precision levels. The documentation admits this guarantee can fail: even with strict types enabled, the optimizer may fuse layers in ways that lose precision constraints, silently substituting lower-precision execution when it conflicts with speed optimization.[^14]

Read that again: a developer explicitly requests safer, higher-precision computation. The infrastructure reserves the right to override that request in pursuit of performance.

From an engineering perspective, this is sophisticated auto-tuning—the engine searches possible execution plans and selects the fastest one. From a legal perspective, this is something that:

1. Overrides explicit safety instructions when they conflict with speed optimization;

2. Makes it impossible for downstream actors to know or control what precision they actually received; and

3. Defeats any "user choice" defense—you cannot argue the integrator "accepted the risk" when the infrastructure can silently reject their safety preferences.

### **3.1.4 Defect 4: The Wrapper and Fragmented Control**

The opacity analysis sharpens when legal AI products are built on third-party model APIs—the increasingly common "wrapper" architecture.

Consider a legal-tech vendor, LegalEagle, built on top of BigAI's infrastructure. LegalEagle controls the interface, the prompts, the RAG pipeline, and the marketing. BigAI controls the base model, the precision tier, the routing logic, and the update cadence. Neither controls the full stack. Neither sees the full stack.

This creates two interlocking problems of vertical control:

**The shell game.** When an error occurs, each actor points to the other. LegalEagle says: "We're just an interface; the reasoning came from BigAI." BigAI says: "We sold API access; LegalEagle is responsible for prompt engineering and safety layers." The plaintiff is caught between two defendants who each claim the other controls reasoning quality—and neither can be forced to produce evidence about the other's internal configuration.

**The blind wrapper.** LegalEagle builds its system assuming BigAI serves a particular model at a particular precision. If BigAI silently routes traffic to a quantized variant during peak hours—or pushes an update that changes behavior—LegalEagle may not know. Unless LegalEagle runs costly continuous inspections in production, it is just as blind to BigAI's backend as the end user. The wrapper cannot supervise what it cannot see. The wrapper cannot supervise what it cannot see.

These are problems of control-chain fragmentation: no single actor holds the full vertical stack, and no single actor can answer for it.

But the wrapper architecture creates a second problem—not about who controls the system, but about what records survive. When LegalEagle contractually requires BigAI to delete logs under Zero Data Retention, both parties gain privacy compliance and both lose the evidentiary trail that would let anyone reconstruct what configuration served a given request. That temporal dimension—the destruction of provenance—is addressed in §3.2.

## **3.2 Temporal Opacity \- What Happened Over Time?**

Vertical opacity answers the _who_ question: which upstream actor set, changed, or overrode the precision tier. Horizontal opacity answers the _what happened_ question: what transformations the model underwent before it reached the user—and whether any record of those transformations survives.

To verify the output, you’d need a chain-of-custody from training → transformations → deployment state → per-request configuration. The system exposes none of it, and often destroys what it could have preserved.

The model at the moment of reliance is the end of a timeline. Behind it stretches a provenance chain the user cannot see:

- Training. What data was selected? What was excluded? Under what criteria? These decisions were made months or years ago, by people the user will never meet.

- Transformation. When was the model quantized? By whom? At what precision? Was it re-quantized after deployment?

- Deployment state. What version is running now? Has it changed since integration? Since yesterday?

- Per-request configuration. Which backend served this specific inference? At what precision tier? Under what routing logic?

### **3.2.1 Version Meaningless**

Product names and model labels typically track marketing releases, not stable configuration states. LegalEagle2.0 may refer to dozens of internal checkpoints, quantization variants, and routing configurations—none of which the user can distinguish. The label creates an illusion of stability. The underlying system shifts continuously.

### **3.2.1 Silent Updates**

Providers change weights, safety layers, fine-tuning, or routing rules without user-visible events. No changelog. No notification. No audit trail.

This matters because verification is time-bound. A check performed against a response at 2:00 p.m. does not guarantee that the system will produce the same reasoning quality at 4:00 p.m. if the provider silently routes subsequent requests to a different tier or variant under the same label.

### **3.2.3 Variant Routing**

Different users—or the same user at different times—may be served by different model variants for latency, cost, or load-balancing reasons. The routing decision is invisible at the API layer.

Peak-hour downgrades are common: when demand spikes, infrastructure routes traffic to cheaper, faster, lower-precision variants. The user receives degraded reasoning precisely when system load is highest—and has no signal that anything has changed.

### **3.2.4 Amnesia by Design**

In many production LLM stacks, request handling is designed to be effectively stateless. Fine-grained per-request attribution—which backend engine, which GPU, which precision tier served a specific request—is often not retained by default. The reasons are both technical and commercial.

**Technical drivers.** Standard inference architectures are optimized for stateless throughput. High-performance serving engines treat inference as transient computation, not transactional record. In serverless deployments—increasingly common for API-based legal AI—the specific compute environment that generated the output may physically cease to exist milliseconds after the token is generated, spun down immediately to serve the next customer. Writing configuration metadata to disk for every request imposes latency and storage costs[^15] that conflict with throughput optimization.

**Commercial drivers.** More troubling, base-model providers frame this erasure as a _compliance feature_. Enterprise contracts now sell "Zero Data Retention" (ZDR) to law firms, explicitly promising that prompts, completions, and metadata are processed in memory only and never stored.[^16] The pitch is tailored to lawyers: ZDR protects client confidentiality under Model Rule 1.6.[^17] It ensures that privileged communications are not logged on third-party servers.

Base-model providers leverage the lawyer's own duty of confidentiality to justify an architecture of amnesia—selling data erasure as a shield for client privilege while simultaneously creating a shield against their own liability. The same architecture that protects the client's secrets also ensures that no forensic record exists of the model's configuration at the moment of reliance.

The parallel is exact. Quantization is marketed as **_optimization_**—faster inference, lower cost, better scalability. Zero Data Retention is marketed as **_privacy_** —client confidentiality, compliance, privilege protection. Both are real benefits and both are also liability shields. A base-model provider's margins and its evidentiary immunity travel together.

### **3.2.5 The Evidentiary Suicide Pact**

The wrapper architecture described in §3.1.4 creates a temporal corollary to its control-chain fragmentation. To sell to Big Law, LegalEagle promises Zero Data Retention. To enforce ZDR, it contractually requires BigAI not to log inputs, outputs, or configuration metadata. When litigation arrives, LegalEagle asks BigAI: "What happened?" The answer is predictable: "You paid us to delete that evidence immediately.

The vendor has contractually destroyed its ability to prove the error was BigAI's fault. The provider has contractually immunized itself from attribution. Both parties achieved compliance. Neither can reconstruct provenance.

### **3.2.6 Feasibility Rebuttal: The HFT Comparison**

A claim of technical infeasibility would not survive scrutiny. High-frequency trading operates under microsecond-scale latencies—on the order of 100–200 microseconds, not seconds—yet U.S. and EU regimes require comprehensive order-event reporting and time-stamping infrastructure. In the United States, SEC Rule 613 required the self-regulatory organizations to implement a consolidated audit trail capable of linking an order’s life cycle events (including origination, routing, modification, cancellation, and execution) in a central repository.[^18] In Europe, the MiFID II clock-synchronization standards require microsecond-level timestamp granularity for activity using high-frequency algorithmic trading techniques.[^19] These systems show that capturing fine-grained operational metadata under extreme speed constraints is not science fiction; it is a well-understood compliance architecture.[^20]

If trading infrastructure can do it under microsecond constraints, the argument that legal AI **cannot** log precision tier per request is not a technical limitation. It is an architectural choice. The provenance chain from training to transformation to deployment to per-request configuration _could_ be preserved. It is not—because no one has yet demanded otherwise, and because current practices serve the interests of those who would otherwise be accountable.

## **3.3 Nominal Equivalence: The Convergence**

The preceding sections traced two distinct axes of opacity. Vertical opacity hides _who_ made the precision choice — the layered supply chain of infrastructure providers, base-model vendors, and legal-tech wrappers, each capable of setting or overriding the fidelity parameter without downstream visibility. Horizontal opacity hides _what_ happened to the artifact over time — the buried provenance of training decisions, quantization passes, silent updates, and variant routing that transformed the model before it reached the user.

Both axes are historical. They describe decisions made upstream and over time. But the user does not experience history. The user experiences the interface being displayed. At the moment of reliance, both axes collapse into a single point: the label. LegalEagle2.0. A stable endpoint. A consistent API schema. Fluent outputs that sound like the outputs received yesterday.

This is **Nominal Equivalence**. While not a third form of opacity, it is where the vertical and horizontal opacity converge and are unobservable.

Consider what the label hides:

- **Structural, vertical stack**. Was this inference served by the base-model provider's FP16 flagship, or routed to a cost-optimized INT4 variant by infrastructure the legal-tech vendor doesn't control?

- **Temporal, horizontal timeline**. Was this model quantized once at deployment, or re-quantized after a silent update last Tuesday? Did the routing logic change? Did the safety layer get patched in ways that affect reasoning?

The user cannot answer these questions. Not because the answers are difficult to obtain, but because the architecture was designed so that the interface reveals nothing about either axis. The label is a mask. It presents continuity while the substrate shifts.

This is why nominal equivalence completes the observability gap. A fixed interface creates the expectation of stability. Two-axis opacity creates the reality of hidden variance. Nominal equivalence is the mechanism by which the expectation and the reality never meet — the mask that ensures the user cannot see the gap at the moment it matters.

The result is not merely that verification is hard. It is that verification is architecturally impossible at the moment of reliance. The user would need to see through the label to the vertical stack and backward through time to the horizontal provenance. The label is designed to prevent exactly that.

This convergence has doctrinal consequences. When a system fails — when it misses an exception, collapses a multi-step test, or inverts a burden of proof — the user cannot attribute the failure to a specific configuration. Was it the precision tier? The routing state? A silent update? The label provides no answer. And the parties who control both axes — who made the vertical choices and the horizontal transformations — are the only ones who could answer.

The gap follows the architectural choice.

- Version meaninglessness. Product names and model labels typically track marketing releases, not stable configuration states. "LegalEagle2.0" may refer to dozens of internal checkpoints, quantization variants, and routing configurations—none of which the user can distinguish.
- Silent updates. Providers change weights, safety layers, fine-tuning, or routing rules without user-visible events. No changelog. No notification. No audit trail.
- Variant routing. Different users—or the same user at different times—may be served by different model variants for latency, cost, or load-balancing reasons. The routing decision is invisible at the API layer.

Taken together, these mechanisms convert verification into a moving target. The system behaves less like a static file and more like a live service whose internal state shifts while its external presentation remains constant.

# **4\. The Professional Responsibility Crisis**

#### **_When Reasonable Verification Becomes Structurally Impossible_**

Core claim: Ethics doctrine assumes verification is feasible; modern deployment architecture often defeats that assumption for latent, configuration-linked errors.

## **4.1 The Ethical Baseline: Competence, Supervision, and the Hidden Premise**

Professional responsibility doctrine has begun to address generative AI, but its foundational assumptions predate the deployment architectures now in use.

**Model Rule 1.1 (Competence)** requires lawyers to understand "the benefits and risks associated with relevant technology" in the representation. The duty is not to become an engineer, but to grasp the material characteristics of tools that affect client outcomes.

**Model Rules 5.1 and 5.3 (Supervision)** extend this obligation to work product generated with assistance—whether human or tool-mediated. A lawyer who delegates research to an associate must supervise that work. The same logic applies to AI-assisted drafting: the lawyer remains responsible for ensuring the output meets professional standards.

**ABA Formal Opinion 512 (2024)** synthesizes these principles for generative AI specifically. It emphasizes "an appropriate degree of review and verification" calibrated to "the nature and complexity of the task, the AI tool's known strengths and limitations, and the potential consequences of error." The opinion also addresses confidentiality, communication, and fee considerations—but verification is the doctrinal load-bearing element.

Crucially, **2222222** does not demand omniscience. It calibrates the duty to what is reasonably knowable and controllable. A lawyer is not expected to verify facts she has no reason to doubt; she is expected to verify where professional judgment indicates risk.

This contains a hidden premise: **verification presupposes that material specifications are observable**. The duty to "**understand benefits and risks**" assumes those risks are observable or discoverable with reasonable diligence. The duty to verify assumes the relevant parameters are stable enough that verification at one moment remains meaningful at the next.

When these premises hold, professional responsibility doctrine works. But what happens when doctrine asks lawyers to do something that the architecture has made structurally impossible?

## **4.2 The Sanctions Paradigm: Patent Errors and the Presumption of Verifiability**

The first wave of judicial opinions addressing AI-assisted legal work involves a specific failure mode: fabricated citations. These cases establish important norms, but they also encode assumptions that do not generalize to all AI errors.

Mata v. Avianca, Inc. (S.D.N.Y. 2023\) is the foundational case.[^21] Counsel submitted a brief containing citations to cases that did not exist—fabricated by ChatGPT. The court imposed sanctions, framing the failure as an abandonment of basic verification duties. The attorney could have checked whether the cited cases existed. He did not. Sanctions followed.

Park v. Kim (2d Cir. Jan. 30, 2024\) reinforced this expectation at the appellate level.[^22] Counsel again submitted fabricated citations generated by AI. The Second Circuit characterized the failure as conduct "well below the basic obligations of a practicing attorney" and referred counsel for potential discipline.

These cases are correctly decided on their facts. A citation to a nonexistent case is a patent error—one that is facially detectable with ordinary diligence. The case either exists in the reporter or it does not. Westlaw and Lexis provide definitive answers. A lawyer who submits fabricated citations has failed a verification step that was straightforward and available.

But the doctrinal frame these cases establish carries an implicit assumption: AI errors are patent. The sanctioned conduct involves falsity that is obvious once anyone bothers to check. The cases do not address—because they did not involve—errors that are latent: outputs that appear facially correct, cite real authorities, and read as competent legal analysis, but contain subtle reasoning failures invisible to surface inspection.

The Mata/Park paradigm works for hallucinated citations. It does not scale to Fluency–Reasoning Divergence.

## **4.3 The Collision: Ethics Rules vs. Technical Reality**

Fluency–Reasoning Divergence produces a category of error that existing professional responsibility doctrine is not equipped to handle.

Patent errors are the Mata/Park world: fake cases, fabricated quotes, citations that do not exist. These errors are catchable. The verification duty is meaningful because the check is available and dispositive.

Latent errors are different. Under FRD, the case is real. The citation is real. The prose is fluent. But the reasoning is corrupted:

- A multi-factor test that quietly drops one prong.
- A burden of proof that gets inverted mid-analysis.
- An exception swallowed by a general rule.
- Gross negligence collapsed into recklessness as if they were synonyms.

A holding stated with confidence that subtly misstates what the court actually held.

These are not hallucinations in the Mata sense. They are reasoning failures masked by surface competence—the signature of configuration-linked capacity loss, not random fabrication.

The verification problem is now structural. To catch a dropped exception, the lawyer must independently know the exception exists. To catch an inverted burden, she must already know which party bears it. To catch a collapsed distinction, she must already understand the distinction the system failed to preserve. In each case, the "verification" that would catch the error requires the lawyer to already possess the knowledge the AI was consulted to provide.

This is not a marginal increase in difficulty. It is a category shift. Checking whether "347 U.S. 483" exists is a lookup. Checking whether a facially plausible legal analysis correctly applies a multi-factor test to a novel fact pattern is doing the legal work from scratch.

Professional responsibility doctrine assumes verification is feasible. FRD makes verification circular: the only way to catch the error is to not need the tool.

## **4.4 The River vs. the Rock: Why Verification Becomes Time-Bound and Non-Transferable**

Even if a lawyer could somehow verify the substantive correctness of one output, a second problem remains: the system she verified may not be the system she relies on.

The sanctions paradigm implicitly assumes the tool is a rock—a stable artifact whose behavior at one moment predicts its behavior at the next. A casebook does not change overnight. A statutory database updates on known schedules. If a lawyer verifies that Westlaw returns accurate results on Monday, she has reason to trust it on Tuesday.

Served AI models are not rocks. They are rivers.

Silent updates: Providers push model updates, fine-tuning adjustments, and safety patches without notice or versioning that users can track.

Dynamic routing: Infrastructure may route queries to different model variants based on load, cost optimization, or A/B testing—without exposing the routing decision to the user.

Precision-tier shifts: The "same" endpoint may serve FP16 during low-traffic hours and INT4 during peak demand, or vice versa, with no signal at the API layer.

Hotfixes and rollbacks: A model that passed internal evaluation last week may be quietly swapped for a different checkpoint this week.

The result is that verifying at 2:00 PM verifies that inference—not the inference you will receive at 4:00 PM under the "same" label.

A lawyer who tests a legal AI tool on a sample problem and receives a correct answer has learned something about that moment. She has not validated the tool for future use, because the tool's configuration may change between test and reliance without any observable signal.

This is horizontal opacity operationalized as a supervision problem. The "reasonable supervision" contemplated by Model Rules 5.1 and 5.3 becomes temporally fragile when the supervised system is dynamic. You cannot meaningfully supervise a river by checking it once.

## **4.5 The Observability Gap**

The preceding sections establish a structural problem: professional responsibility doctrine demands verification, but modern deployment architecture defeats verification in two independent ways—latency (errors that are not facially detectable) and dynamism (systems that change faster than validation cycles).

The result is the observability gap: a structural distance between the legal duty to verify and the technical ability to observe material specifications.

The gap arises from a specific mechanism: Nominal Equivalence. The lawyer sees a stable endpoint, a consistent product name, and fluent outputs. She does not see—and cannot see—the precision tier, the routing state, the model version, or whether any of these have changed since her last interaction. The interface presents continuity. The backend may deliver variance.

From this gap follows a principle that must be stated cleanly:

**Bounded Responsibility**. Lawyers can be held professionally responsible for risks they can verify. Where the risk driver is architecturally concealed—where the material specification is non-observable at the moment of reliance—the duty to verify is structurally defeated.

This is not an argument that lawyers should be absolved of all responsibility for AI-assisted work. It is an argument about where responsibility can coherently attach given the architecture.

If a lawyer submits a fabricated citation, she has failed a verification step that was available. Sanctions are appropriate.

If a lawyer relies on a facially correct, fluently reasoned analysis that contains a subtle doctrinal error induced by undisclosed quantization—an error she could not detect without independently re-deriving the analysis—she has encountered a failure mode the architecture was designed to hide. Holding her responsible for that failure, while the parties who controlled the precision parameter face no accountability, is not professional responsibility. It is liability laundering.

This gap cannot be closed by exhortation. Telling lawyers to "verify more carefully" does not make latent errors patent. Telling lawyers to "understand the technology" does not make non-observable configurations observable. The gap is architectural. It can only be closed by architectural means: restoring the observability that current deployment practices have removed

# **ACT II: QUANTIZATION \- PART II: THE LIABILITY SHIFT**

# **5\. The Shift**

####

#### **_Quantization as Material Specification, Not ‘that’s just how it is’_**

**Core claim.** If Chapter 4 shows the end user cannot realistically bear the risk, familiar doctrines shift responsibility toward actors who choose, control, conceal, or represent the specification.

## **5.1 Piercing Defense**

The predictable vendor response to any AI-related claim is that the AI is "just a tool"—and that responsibility for tool outputs lies with the user who chose to rely on them. This defense has intuitive appeal: a hammer manufacturer is not liable when someone hits their thumb.

But the tool analogy fails for systems that generate substantive outputs under conditions of architectural opacity. A hammer does not decide how to swing itself. A quantized legal AI system makes configuration-determined choices about how to reason—choices the user cannot see, control, or override.

**Moffatt v. Air Canada (2024 BCCRT 149\)** provides an early wedge against the tool defense.[^23] The case involved an airline chatbot that provided incorrect information about bereavement fare policies. When a passenger relied on that information and was denied the promised discount, Air Canada argued the chatbot was a "separate legal entity" or a "mere tool" for which the airline bore no responsibility.

The British Columbia Civil Resolution Tribunal rejected both arguments. The chatbot was part of Air Canada's customer service apparatus. Its statements were attributable to the airline. The airline could not escape responsibility by pointing to the tool's autonomous operation.

Moffatt is not a products liability case, and it does not involve quantization. Its significance is narrower but important: it rejects the categorical claim that deployers can disclaim responsibility for AI outputs by characterizing the AI as an independent agent or a neutral tool. When a vendor deploys an AI system as part of its service offering—and users reasonably rely on that system's outputs—the vendor cannot disavow the outputs when they prove wrong.

For legal AI, the implication is direct. A legal-tech vendor that deploys a quantized model under the banner "Legal Research Assistant" cannot, when FRD-induced errors cause harm, escape by arguing that the AI was "just a tool" the lawyer should have supervised better. The vendor chose the configuration. The vendor controls the precision parameter. The vendor bears responsibility for what that configuration produces.

## **5.2 Product Framing in U.S. Litigation**

Whether AI systems qualify as "products" for purposes of products liability law remains unsettled. Courts have historically distinguished products (tangible goods) from services (professional judgment, advice). Software occupies contested terrain. AI-generated outputs—which blend algorithmic processing with something resembling substantive advice—are even harder to classify.

Garcia v. Character Technologies, Inc. (M.D. Fla. 2025\) offers early evidence that courts may not accept a clean "just speech" or "just a service" off-ramp for AI harms[^24]. The case involved claims that an AI chatbot's outputs caused harm to users. At the pleadings stage, the court declined to dismiss product-liability styled theories, allowing claims to proceed that treated the AI system as a product subject to design-defect analysis.

Garcia is not a merits ruling. It does not establish that AI is definitively a "product" across jurisdictions. What it shows is that plaintiffs can plausibly plead product-liability theories against AI systems—and that courts are not reflexively dismissing such claims at the threshold.

For quantization-related claims, this matters. If AI systems can be analyzed under design-defect frameworks, then the risk-utility analysis and reasonable-alternative-design test apply. And as the next section shows, quantization fits comfortably within that framework.

## **5.3 Design Defect: Quantization as a Defective Configuration Choice**

Quantization and bit precision is not some random is not some random quirk. It is a design choice about how much numerical precision to preserve in the weights of a legal AI system. When that choice predictably degrades legal reasoning while leaving surface fluency intact—and when safer, higher-precision configurations are feasible and commercially available—it fits within modern design-defect doctrine.

### **5.3.1 The Risk-Utility Framework**

Under products-liability law, a design defect exists when a product's design creates an unreasonable risk of harm that could have been reduced by adopting a reasonable alternative design.[^25] Quantization satisfies this test.

Risk exists. Empirical results in the computer-science literature show that low-bit quantization can more than double error rates on reasoning-intensive tasks while leaving surface fluency largely unchanged. In legal applications, this manifests as Fluency–Reasoning Divergence: the model continues to produce coherent, confident prose while its ability to track exceptions, burdens, and multi-step doctrine quietly erodes.

The risk is unreasonable in legal contexts. A 10–20% elevation in subtle reasoning failures might be tolerable for consumer chatbots or entertainment applications. It is categorically unacceptable for tools that opine on liberty, liability, and substantial financial stakes. Changing "shall" to "may," dropping a prong from a multi-factor test, or misclassifying "gross negligence" as "recklessness" changes the legal effect of the analysis.

A reasonable alternative exists. Higher-precision configurations—FP16/BF16 for most architectures—are technically feasible and widely implemented. Vendors run full-precision variants during training and evaluation. Quantized INT8/INT4 variants are chosen primarily for economic reasons: lower memory footprint, higher throughput, reduced inference cost.

### **5.3.2 The Reasonable Alternative Design (Framed Correctly)**

Design-defect doctrine does not require that the alternative be cost-free or universally deployed. It requires that the alternative be reasonable—feasible, available, and effective at reducing the identified risk.

The reasonable alternative for quantization-induced FRD is not "FP16 always, for all users, at all price points." That framing invites the predictable rebuttal: "Higher precision is too expensive at scale."

The correct framing is: legal-grade alternatives exist and are feasible in targeted contexts. These include:

- Higher-precision mode for reasoning-critical tasks (available as a selectable tier)

- User-selectable precision configuration with disclosed tradeoffs

- Task-gated routing that reserves higher precision for multi-step legal reasoning while permitting lower precision for simple queries

- Less aggressive quantization (INT8 rather than INT4) for legal product lines

- Disclosure plus logging, so that precision tier is observable and auditable

The alternative design need not eliminate quantization. It must make the precision choice visible, controllable, and appropriately matched to use-case risk.

### **5.3.3 Cost Does Not Automatically Defeat Reasonableness**

Manufacturers often argue that safer alternatives are unreasonable because they cost more. Modern doctrine is more nuanced. The question is whether the incremental cost is justified by the reduction in risk.

In legal practice, where a single misapplied doctrine can invalidate a transaction, trigger sanctions, or cost a client a case, the marginal cost of higher-precision inference is modest relative to the magnitude of potential harm. Moreover, when quantization-induced errors propagate downstream, law firms absorb externalized costs: additional verification, rework, reputational damage, increased insurance premiums. The reasonable-alternative-design inquiry should account for these costs, not just the vendor's GPU bill.

### **5.4 Failure to Warn, Misrepresentation, and Warranty**

Even where design-defect theories face doctrinal uncertainty, informational theories provide an independent path. Vendors who deploy quantized legal AI systems under conditions of nominal equivalence face exposure for failure to warn, misrepresentation, and breach of warranty.

### **5.4.1 Failure to Warn and Misrepresentation (Configuration-Specific)**

Nominal Equivalence as Continuity Signal

Nominal equivalence—the practice of shipping FP16 and INT4 variants under the same model name, version number, and API endpoint—functions as a continuity signal. It communicates: "This is the same product. Capability is unchanged."

When that signal is false—when the INT4 variant has materially degraded reasoning capacity relative to the FP16 variant used for benchmarking and marketing—the signal becomes an implicit misrepresentation. Users who integrate the "LegalEagle2.0" endpoint reasonably expect that it delivers the capabilities associated with that name. They do not expect, and are not told, that the underlying precision configuration may vary in ways that affect reasoning reliability.

#### **Generic Disclaimers Are Inadequate**

Generic "AI may hallucinate" warnings do not cure configuration-specific risks. They suggest a fog of unsystematic error: occasional fabricated citations, off-topic answers, strange digressions. FRD is different. It is a configuration-specific risk tied to a concrete design choice.

The law has long recognized that known, specific risks cannot be adequately addressed by vague generalities. A drug manufacturer that knows its pill causes a particular cardiac side effect cannot satisfy its duty to warn with a label saying "medications carry risks." It must identify the relevant risk with specificity. Quantization-induced Reasoning Decay is the legal AI analogue: once documented, it is a specific, foreseeable failure mode that demands specific disclosure.

#### **The Material Warning**

Where the vendor can foresee FRD-type degradation from a precision-tier choice, the relevant warning is not "AI may err." It is:

- Precision tier served (FP16/BF16/INT8/INT4)

- Routing/variant state (which model version generated this output)

- Change-over-time disclosure (whether configuration has changed since integration)

These are the parameters the user cannot otherwise observe. Disclosing them restores the ability to make informed decisions about reliance.

### **5.4.2 Implied Warranty of Fitness for a Particular Purpose**

When a vendor markets a tool specifically as "Legal AI"—purpose-built for legal work—it represents fitness for the particular purpose of legal reasoning.[^26]

Legal work requires fine-grained distinctions: gross negligence versus recklessness, exception versus general rule, burden on plaintiff versus burden on defendant. If the vendor quantizes the system to a point where it cannot reliably sustain those distinctions (as Chapter 2 documented), the product may be fit for casual conversation but unfit for lawyering.

Breach of implied warranty of fitness does not require proving "product" status in the strict sense. It turns on whether the seller had reason to know the buyer’s particular purpose and that the buyer relied on the seller's skill or judgment to furnish a suitable system.[^27] Courts routinely state the rule in that form.[^28] In transactions that blend goods and services, courts frequently assess Article 2’s applicability by asking whether the agreement’s predominant purpose is the sale of goods (or a similar formulation).[^29]

This theory has practical appeal: corporate buyers and commercial litigators often grasp "breach of warranty" faster than "design defect."

### **5.5 Supply-Chain Liability and Active Override**

The defect in a quantized legal AI system is rarely the work of a single actor. It can be co-produced across multiple layers of the supply chain:

- Infrastructure providers (NVIDIA TensorRT, Google TensorFlow/LiteRT) supply optimization toolkits that may override explicit precision requests

- Base-model providers (OpenAI, Anthropic, Meta) create quantized variants and establish nominal equivalence

- Legal-tech vendors (Harvey, CoCounsel, Lexis+ AI) integrate models into practice-facing products and control final configuration

Montoya v. Character Technologies, Inc. (D. Colo. 2025\) previews the multi-actor pleading posture that quantization cases may require. The case implicates multiple defendants across the AI stack—platform, wrapper, base model—when outputs cause harm. While Montoya remains in early litigation (and should not be cited as merits precedent), it illustrates that courts are prepared to entertain claims that trace responsibility through layered systems rather than artificially isolating a single defendant.

### **5.5.1 The Active Override Problem**

The supply-chain analysis sharpens when infrastructure actively defeats downstream safety choices. As documented in Chapter 3, inference runtimes like TensorRT may override explicit precision requests when those requests conflict with throughput optimization. A developer who sets kSTRICT_TYPES to enforce FP16 may nonetheless receive INT8 execution if the optimizer determines that produces better performance.

**Under Restatement (Third) of Torts § 5**, component suppliers that merely conform to specifications provided by another party are generally shielded from design-defect liability. But that immunity dissolves when the component supplier itself determines the relevant specification. A runtime that reserves the right to override explicit safety preferences is making an independent design choice. It is a co-designer, not a passive conduit.

This has implications for fault allocation. The infrastructure provider that overrides a legal-tech vendor's precision request shares responsibility for the resulting configuration—even if the legal-tech vendor attempted to select a safer option.

### **5.6 Reputational Harms and the Evidentiary Posture**

Walters v. OpenAI provides a boundary case illustrating how courts evaluate AI-generated harms when they reach litigation.

The case involves claims that AI-generated false statements caused reputational injury. What makes it instructive is not the outcome (still developing) but the factors courts examine:

- Disclaimers: Did the vendor adequately warn that outputs might be false?

- Fault standards: What level of culpability attaches to generating false content?

- Reliance and causation: Did the plaintiff actually rely on the output? Was that reliance reasonable? Did it cause the claimed harm?

- Evidentiary posture: Can the plaintiff prove which model version, configuration, or inference produced the contested output?

Walters should not be cited as "confirming actionable injury" from AI outputs. Its significance is different: it shows that courts will demand proof, will scrutinize disclaimers, and will credit disclosure and mitigation architecture.

This supports the governance proposal in Chapter 6\. If courts look for precision-tier disclosure and inference logging when evaluating AI-harm claims, vendors who build that architecture will be better positioned to defend themselves—and plaintiffs harmed by opaque systems will have stronger claims.

### **5.7 Regulatory and Statutory Context**

Emerging regulatory frameworks provide context for—but do not yet resolve—the quantization problem.

EU AI Act establishes transparency and risk-management requirements for high-risk AI systems. It does not explicitly name quantization as a material specification requiring disclosure. This Article argues it should function that way: precision tier affects system capability in ways that implicate the Act's transparency objectives.

EU Product Liability Directive (revised) extends product-liability concepts to software and digital products, including liability for defects introduced through post-sale updates. This fits the "river" problem: a system that was safe at deployment may become unsafe through silent configuration changes. The Directive's framework supports treating precision-tier shifts as potentially defect-creating events.

AI Liability Directive was proposed but subsequently withdrawn. It should not be cited as the coming EU tort regime.

The regulatory landscape is evolving. The core point is that existing frameworks gesture toward transparency and accountability for AI system configurations—but do not yet operationalize those principles at the level of precision-tier disclosure. This Article argues they must.

# **6\. Bridge—The Causation Gap**

Purpose: Governance is not optional—it is an evidentiary prerequisite.

Chapter 5 establishes that quantization-induced FRD can constitute a design defect, that nominal equivalence can support failure-to-warn and misrepresentation claims, and that multiple actors across the supply chain may share fault. But establishing these theories in principle is not the same as proving them in litigation.

### **6.1 What Defense Will Likely Do**

The strongest defense to any FRD claim is epistemic:

**"You cannot prove the contested output was generated under INT4. FP16 models sometimes err as well. This is just AI behavior—probabilistic, unpredictable, and not attributable to any specific configuration choice."**

The defense succeeds if the missing configuration evidence is treated neutrally. Without records tying the inference in question to a specific precision tier, model version, and routing state at the relevant timestamp, the plaintiff cannot establish that quantization caused the error rather than some other source of model fallibility.

### **6.2 Why Discovery Alone Won’t Fix It**

In many production LLM stacks—especially those optimized for privacy or high-throughput serving—request handling is designed to be effectively stateless, and fine-grained per-request attribution (e.g., which backend engine/GPU/variant served a specific request) may not be created or retained by default unless explicit inference logging or tracing is enabled, in part because end-to-end tracing and log export impose real latency/throughput and storage costs.

In such scenarios, proving configuration-specific causation requires evidence that currently may not exist:

- What precision tier served the contested inference?

- What model version/variant was active at that timestamp?

- Were any routing, load-balancing, or override mechanisms in play?

- Has the configuration changed since the contested inference?

As mentioned in Chapter 3, vendors market stateless architecture as a privacy feature—selling "Zero Data Retention" to law firms as protection for client confidentiality under Model Rule 1.6. In other words, vendors leverage the lawyer's own duty of confidentiality to justify a zero-memory architecture, creating the necessary shield for client privilege that doubles as a shield against their own liabilities.

The defense will claim that per-request configuration records simply do not exist—that the architecture is stateless by necessity. This claim does not hold. High-frequency trading systems face latency constraints orders of magnitude tighter than LLM inference, yet maintain deterministic audit trails as a regulatory requirement. The absence of inference logs is not technical inevitability. It is a design choice—one that vendors have made, and one the legal system need not treat as neutral.

The plaintiff knows something went wrong. The plaintiff suspects quantization. But the plaintiff cannot prove it—because the architecture was designed to make that proof unavailable.

### **6.3 The Counter-Move**

This is where P-module logic (introduced in the Afterword) becomes essential. The vendor asserts fitness for legal work. The vendor builds no disclosure architecture—no precision-tier logging, no inference records, no change-control audit trail. The vendor creates the evidentiary gap.

The bounded-responsibility principle applies: the party that chose non-observability cannot then complain that the plaintiff failed to observe.

If the defendant controls the configuration evidence and does not produce records sufficient to attribute the contested output to a specific configuration, the resulting uncertainty cannot defeat causation by default. Otherwise, the party with architectural control wins by making proof structurally unavailable.

### **6.4 The Payoff**

This reframes Chapter 6 governance proposals. Precision-Tier Disclosure and Inference Logging is not compliance theater. It is an evidentiary prerequisite for fault allocation in dynamic deployment stacks.

Without it, quantization claims are unprovable. With it, responsibility can be traced through the supply chain to the actors who controlled the configuration.

The gap follows the architectural choice.

# **7\. GOVERNANCE & MARKET CORRECTION**

# **8\. CONCLUSION**

[^1]: Li et al. (2025): Zhen Li, Yupeng Su & Yabin Zhang, Quantization Meets Reasoning: Exploring LLM Low-Bit Quantization Degradation for Mathematical Reasoning, arXiv:2501.03035 at 2 (Jan. 5, 2025), [https://arxiv.org/abs/2501.03035](https://arxiv.org/abs/2501.03035).

[^2]: Ruikang Liu et al., Quantization Hurts Reasoning? An Empirical Study on Quantized Reasoning Models, arXiv:2504.04823 (Apr. 6, 2025), [https://arxiv.org/abs/2504.04823](https://arxiv.org/abs/2504.04823).

[^3]: _We Ran Over Half a Million Evaluations on Quantized LLMs—Here’s What We Found_, Red Hat Dev. (Oct. 17, 2024), [https://developers.redhat.com/articles/2024/10/17/we-ran-over-half-million-evaluations-quantized-llms](https://developers.redhat.com/articles/2024/10/17/we-ran-over-half-million-evaluations-quantized-llms)

[^4]: Perplexity measures fluency—how natural and confident the model's prose sounds. It doesn't measure whether the content is accurate. Jin's finding that perplexity stays flat through aggressive compression means the model keeps sounding competent even as its reasoning degrades

[^5]: Hongyi Jin et al., A Comprehensive Evaluation of Quantization Strategies for Large Language Models, arXiv:2402.16775 (Feb. 26, 2024), [https://arxiv.org/abs/2402.16775](https://arxiv.org/abs/2402.16775) .

[^6]: _See_ Joe Needham et al., _Large Language Models Often Know When They Are Being Evaluated_, arXiv preprint arXiv:2505.23836 (2025) (demonstrating that frontier models can distinguish between evaluation transcripts and real-world deployment with high accuracy, potentially altering behavior to "game" assessments).

[^7]: Id at 30320\. (explaining that "outlier features" with large magnitudes are critical for model performance and are destroyed by standard quantization).

[^8]: See Ruikang Liu et al., Quantization Hurts Reasoning? An Empirical Study on Quantized Reasoning Models, arXiv preprint arXiv:2504.04823 (2025) (finding that reasoning capabilities degrade significantly faster than general language fluency under low-bit quantization); see also Sianyi Li et al., Exploring LLM Low-Bit Quantization Degradation for Mathematical Reasoning, arXiv preprint arXiv:2501.03035 (2025).

[^9]: Taehee Jeong, _4bit-Quantization in Vector-Embedding for RAG_, arXiv preprint arXiv:2501.10534 (2025) (demonstrating that 4-bit quantization significantly degrades retrieval accuracy for nuanced semantic queries).

[^10]: Melih Yazan et al., _The Impact of Quantization on Retrieval-Augmented Generation: An Analysis of Small LLMs_, CEUR Workshop Proc. (2024) (finding that quantized generators fail on long-context synthesis even when retrieval is accurate).

[^11]: Here, "float" refers to floating-point numbers—the high-precision numerical format (like 16-bit or 32-bit) that neural networks use during training and evaluation. When engineers say a quantized model has a "float-compatible interface," they mean the model accepts and returns data in this high-precision format even though its internal computations occur at much lower precision (INT8 or INT4). The outside looks the same. The inside has changed.

[^12]: _See_ TensorFlow Lite Post-Training Quantization, TensorFlow Developers (2024), [https://www.tensorflow.org/lite/performance/post_training_quantization](https://www.tensorflow.org/lite/performance/post_training_quantization) (explaining that quantized models maintain float input/output interfaces "in order to have the same interface as the original float only model," enabling drop-in replacement without signaling the computational change at the API boundary).

[^13]: _See_ NVIDIA TensorRT Developer Guide: Working with INT8 (2024), [https://docs.nvidia.com/deeplearning/tensorrt/developer-guide/index.html\#working-with-int8](https://docs.nvidia.com/deeplearning/tensorrt/developer-guide/index.html#working-with-int8) (describing implicit quantization mode where "INT8 is used opportunistically to optimize layer execution time" with "developers having little control over when and where INT8 is used").

[^14]: _See_ NVIDIA TensorRT Developer Guide: Layer Precision (2024) (acknowledging that even with kSTRICT_TYPES enabled, "the optimizer may fuse layers in ways that lose precision constraints" when layer fusion conflicts with user-specified precision requirements).

[^15]: OpenTelemetry, _Performance_ (updated June 11, 2025), https://opentelemetry.io/docs/zero-code/java/agent/performance/ (noting that span volume can affect agent overhead and recommending trace sampling to reduce overhead); NVIDIA, _Triton Inference Server—Triton Server Trace_ (describing tracing enabled via \--trace-config, sampling via rate, and reporting “Overhead (avg)” in the trace summary example), https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user\_guide/trace.html.

[^16]: _See_ Data, Privacy, and Security for Azure OpenAI Service, MICROSOFT LEARN (2025) (stating that under Zero Data Retention, "prompts and completions are not stored" and customer data is not retained beyond real-time processing); _see also_ Data Controls in the OpenAI Platform, OPENAI.COM (2025) (describing ZDR as excluding "customer content from abuse monitoring logs" with the "store parameter... always treated as false").

[^17]: _See_ Model Rules of Prof'l Conduct R. 1.6(c) (Am. Bar Ass'n 2023\) ("A lawyer shall make reasonable efforts to prevent the inadvertent or unauthorized disclosure of, or unauthorized access to, information relating to the representation of a client.").

[^18]: Securities and Exchange Commission, Rule 613 (Consolidated Audit Trail) (Oct. 11, 2017), [https://www.sec.gov/about/divisions-offices/division-trading-markets/rule-613-consolidated-audit-trail](https://www.sec.gov/about/divisions-offices/division-trading-markets/rule-613-consolidated-audit-trail?utm_source=chatgpt.com) (explaining that Rule 613 was adopted to create a comprehensive consolidated audit trail and requires reporting of order “reportable event\[s\]” such as origination, modification, cancellation, routing, and execution to a central repository)

[^19]: Commission Delegated Regulation (EU) 2017/574 of 7 June 2016 supplementing Directive 2014/65/EU with regard to regulatory technical standards for the level of accuracy of business clocks, Annex tbl. 2, 2017 O.J. (L 87\) 148, 150 (requiring for “Activity using high frequency algorithmic trading technique” maximum divergence from UTC of 100 microseconds and timestamp granularity of 1 microsecond or better).

[^20]: Matteo Aquilina, Eric Budish & Peter O’Neill, Quantifying the High-Frequency Trading “Arms Race,” BIS Working Papers No. 955, at 17 (Aug. 2021), [https://www.bis.org/publ/work955.pdf](https://www.bis.org/publ/work955.pdf?utm_source=chatgpt.com) (reporting a median “Actual Observed Latency” of about 150 microseconds, illustrating microsecond-scale operational constraints).

[^21]:

[^22]:

[^23]: _Moffatt v. Air Canada_, 2024 BCCRT 149, paras. 90–97 (CanLII) (rejecting the deployer’s attempt to avoid responsibility for chatbot statements and treating the chatbot output as the company’s representation).

[^24]: _Garcia v. Character Techs., Inc._, No. 6:24-cv-01903-ACC-UAM, slip op. at 11, 27–29 (M.D. Fla. May 21, 2025\) (noting defendants’ arguments that the First Amendment bars claims and that the chatbot is “not a product,” and pushing back on the notion that “words strung together by an LLM” automatically qualify as protected speech on defendants’ framing).

[^25]: Restatement (Third) of Torts: Prods. Liab. § 2(b) (Am. L. Inst. 1998\) (design defect turns on reasonable alternative design / risk-utility).

[^26]: U.C.C. § 2-315 (Am. L. Inst. & Unif. L. Comm’n 1977\) (imposing an implied warranty of fitness where the seller has reason to know the buyer’s particular purpose and the buyer relies on the seller’s skill or judgment).

[^27]: Id. (same).

[^28]: Baird v. Scribner Coop., Inc., 237 Neb. 532, 466 N.W.2d 798, 801 (1991) (stating that to recover for breach of the implied warranty of fitness, the buyer must show seller’s reason to know the particular purpose, seller’s reason to know of reliance, and actual reliance).

[^29]: Bonebrake v. Cox, 499 F.2d 951, 960 (8th Cir. 1974\) (articulating the “predominant factor/purpose” test for whether Article 2 applies to mixed goods-and-services contracts).

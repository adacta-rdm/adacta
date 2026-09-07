---
title: Samples and batches
---

The **Samples** section organizes material into batches and individual samples. This structure is appropriate for catalyst testing: a catalyst preparation is represented as a batch, while the portions installed in reactors or used for characterization are represented as samples. {% .lead %}

## Create a batch

Select **Create Batch** in the left pane, enter a unique batch name, and confirm the entry. The batch list is shown in Figure 21.

{% figure src="/docs-placeholder.svg" alt="Sample-batch list and the Create Batch control." caption="Figure 21: Sample-batch list and the Create Batch control." /%}

Use a stable batch identifier that can be matched to the laboratory preparation record. Avoid generic names such as "Batch 1" in production databases unless that naming convention is uniquely controlled elsewhere.

## Add and edit samples

Select the batch, then press **Add Sample**. Enter a unique sample name and confirm. The batch page lists the samples together with the creator and creation time, as shown in Figure 22.

{% figure src="/docs-placeholder.svg" alt="Samples listed within a batch." caption="Figure 22: Samples listed within a batch." /%}

Select a sample to open its detail page. Use **Edit** to correct the sample name. A sample should represent a physical portion of the batch, not merely a data column or analytical result.

## Install a sample in a facility state

Create the batch and sample before editing the facility state. In the flowchart, select the device that physically contains the sample, add the sample, and save the state. When the sample is replaced, create a new state with the replacement time and assign the new sample there.

This sequence preserves the time interval over which each sample was installed.

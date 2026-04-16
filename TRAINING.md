# How to Train the Separation Agent

**Audience:** Anyone on the Craft MFG team. No tech experience needed.

The Separation Agent gets smarter every time you teach it. There are three ways to teach it. None of them require code.

---

## The big picture

Imagine you're training a new junior separator. You'd:

1. **Show them past work** — "Here's the customer's file. Here's what we showed them. Here's how I separated it. Here's why."
2. **Watch them try** — "Okay, look at this new job. What would you do?"
3. **Correct them** — "Close, but you missed the underbase trap on the white. Here's why that matters."

The Separation Agent learns the same way. Your job is to be the senior separator.

---

## Method 1 — Add a past job

This is the most important one. The more past jobs you add, the smarter the agent gets.

### What you need

For ONE job, you need three files:

| File | What it is | Where to find it |
|---|---|---|
| **Customer file** | The original art the client sent us | Original email / Drive folder |
| **Mockup** | The picture we showed the client | Drive folder for that job |
| **Separation** | The final hi-res separation we printed from | Drive folder for that job |

### Steps

1. Open the Separation Agent in your browser.
2. Click **"+ Add Past Job"**.
3. Fill in the basics:
   - Customer name
   - Job name or PO number
   - Garment color (e.g. black, athletic heather, white)
   - Print method (simulated process / spot color / 4-color process / etc.)
   - Number of colors in the separation
   - Difficulty (1 = easy, 5 = nightmare)
4. **Pick the three files from Google Drive** using the file picker buttons. (You can't upload from your computer — everything has to live in our Drive.)
5. Add **tags** that describe the job. Examples:
   - `halftones` `gradients` `fine-lines` `white-underbase` `metallic`
   - `moire-risk` `tight-registration` `fashion-fit` `dark-garment`
6. In the **Notes** box, write what was tricky and how you solved it. Be casual. Examples:
   > "Client sent low-res JPG, had to rebuild the smoke effect from scratch. Used a 55-line halftone at 22.5° on the grey to avoid moire with the white underbase."
   > "Gradient on the lettering would've banded — broke it into 3 spot colors instead of trying to halftone."
7. Hit **Save**.

The agent will spend a minute or two reading the files. When it's done, the job shows up in the library.

### How many is enough?

- **First 20 jobs:** the agent starts to spot patterns
- **First 100 jobs:** the agent starts being useful
- **First 500 jobs:** the agent starts being a real asset

Add a few each day. You don't need to do them all at once.

---

## Method 2 — Review the agent's critique

Once a job is added, click **"Run Critique"** on it. The agent will write up:

- What it sees in the customer file
- What changed between customer file and mockup
- How it would have separated this
- What it thinks the hard parts were

**Your job:** read that critique and tell the agent how it did.

There are three buttons at the bottom of every critique:

- ✅ **Spot on** — agent nailed it
- ⚠️ **Partially right** — agent got most of it but missed something
- ❌ **Wrong** — agent misread the job

If you click ⚠️ or ❌, a box opens up. Type in plain English:

- **"What did the agent miss?"** (e.g. "Missed that this needed a discharge underbase because the garment is dyed cotton")
- **"What did the agent get wrong?"** (e.g. "It said this was simulated process — it's actually spot color with a halftone gradient")

Hit Save. That correction goes straight into the agent's memory. Next time it sees a similar job, it'll do better.

---

## Method 3 — Tag problem areas on the artwork

When you're looking at a past job, you can click directly on the customer file or the separation and **drop a pin** on a problem area.

Each pin gets a short note:

- "This text was too small — had to bump it up 3pt"
- "Client used RGB blue here, had to convert to a printable spot"
- "This drop shadow would moire — turned it into a hard outline"

Pins are GOLD. They teach the agent to look at specific spots and recognize specific problems.

---

## What makes a GOOD training example?

- **Clear notes.** "It was hard" is useless. "The white underbase had to be choked 1px to keep the registration tight on the small text" is gold.
- **Honest tags.** Don't tag every job with everything. Only tag what's actually relevant.
- **Real corrections.** When the agent is wrong, say WHY it's wrong, not just "wrong."
- **Variety.** Add easy jobs AND hard jobs. The agent needs to know what "easy" looks like too.

---

## What NOT to do

- ❌ Don't upload files from your computer. Everything goes through Drive.
- ❌ Don't skip the notes field. Tags + notes are how the agent learns *why*.
- ❌ Don't mark a critique "spot on" if it's only mostly right. Be honest.
- ❌ Don't add the same job twice. Search the library first.
- ❌ Don't share your login. Each person logs in with their own Craft Google account so we can see who taught what.

---

## When something looks wrong

If the agent says something dangerously wrong — like recommending a technique that would ruin a press run — flag it with the ❌ button AND ping Eric. We want to catch bad patterns early.

---

## Questions

Ask Eric. The agent is built in-house so we can change anything that's not working.

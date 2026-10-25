import { QuestPreview } from "@/components/quest-preview";

const chapters = [
  { number: "01", icon: "⌁", title: "Cross paths", text: "A nearby QuestGo device opens the door to a shared adventure." },
  { number: "02", icon: "✧", title: "Say yes, together", text: "One quest, shared by both of you. The adventure starts when you both accept." },
  { number: "03", icon: "❋", title: "Make a memory", text: "Step into the real world. Both confirm you’re done to complete your quest." },
];

export default function Home() {
  return (
    <main>
      <header className="site-header mx-auto flex items-center justify-between">
        <a className="wordmark" href="#" aria-label="QuestGo home"><span className="brand-mark" aria-hidden="true">✳</span> Quest<span>Go</span><span className="brand-dot">.</span></a>
        <nav aria-label="Main navigation" className="flex items-center gap-7">
          <a className="nav-link" href="#how-it-works">The story</a>
          <a className="nav-link" href="#quest-preview">Quest preview</a>
          <a className="nav-cta" href="#quest-preview">Take a peek <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <section className="hero mx-auto" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span aria-hidden="true">✦</span> FOR THE WANDERERS & THE WONDERERS</p>
          <h1 id="hero-title">Every hello<br />could be a<br /><em>little adventure.</em></h1>
          <p className="hero-description">Good stories start with a chance encounter. Turn yours into a real-world quest, with someone right beside you.</p>
          <div className="hero-actions flex flex-wrap items-center gap-5">
            <a className="button button-primary" href="#quest-preview">Discover a quest <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#how-it-works">How the magic works <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-note"><span className="little-star" aria-hidden="true">✧</span> Less scrolling. More stories worth telling.</div>
        </div>

        <div className="storybook" role="img" aria-label="An enchanted forest with rolling hills, a winding trail, a golden sun, and two travelers meeting along the path">
          <div className="scene-grain" />
          <span className="scene-label">THE WORLD IS BETTER, TOGETHER</span>
          <div className="sun" /><div className="sun-ring" />
          <div className="cloud cloud-one" /><div className="cloud cloud-two" />
          <div className="mountain mountain-one" /><div className="mountain mountain-two" />
          <div className="hill hill-back" /><div className="hill hill-middle" /><div className="trail" /><div className="hill hill-front" />
          <div className="tree tree-one"><i /><b /></div><div className="tree tree-two"><i /><b /></div><div className="tree tree-three"><i /><b /></div>
          <div className="traveler traveler-one"><i /><b /><span /></div><div className="traveler traveler-two"><i /><b /><span /></div>
          <span className="spark spark-one">✦</span><span className="spark spark-two">✧</span><span className="spark spark-three">✦</span>
          <div className="scene-ticket"><span className="ticket-icon">⌁</span><div>A chance encounter.<br /><strong>A brand-new chapter.</strong></div><span aria-hidden="true">✧</span></div>
          <span className="scene-coordinate">SOMEWHERE NEAR YOU · SOMETHING NEW</span>
        </div>
        <div className="hero-side-note" aria-hidden="true">a little curiosity goes a long way ↗</div>
      </section>

      <div className="chapter-divider mx-auto"><span>NEARBY PEOPLE. SHARED QUESTS. REAL CONNECTION.</span><span aria-hidden="true">✳</span><span>YOUR NEXT STORY IS CLOSER THAN YOU THINK.</span></div>

      <section id="how-it-works" className="how-section mx-auto" aria-labelledby="how-title">
        <div className="section-heading"><div><p className="eyebrow">A LITTLE MAGIC. THREE SIMPLE STEPS.</p><h2 id="how-title">From strangers to <em>storytellers.</em></h2></div><p>No grand plans required.<br />Just a little room for the unexpected.</p></div>
        <div className="chapter-grid">{chapters.map((chapter) => <article className="chapter" key={chapter.number}><div className="chapter-top"><span className="chapter-icon" aria-hidden="true">{chapter.icon}</span><span className="chapter-number">CHAPTER {chapter.number}</span></div><h3>{chapter.title}</h3><p>{chapter.text}</p></article>)}</div>
      </section>

      <section id="quest-preview" className="preview-section mx-auto" aria-labelledby="preview-title">
        <div className="preview-copy"><p className="eyebrow">A SMALL QUEST. A GOOD STORY.</p><h2 id="preview-title">Ordinary places.<br /><em>Unexpected moments.</em></h2><p>A ten-minute wander. A fresh perspective. A conversation you wouldn’t have had otherwise.</p><p>Here’s a taste of what you could discover together.</p><span className="preview-label">INTERACTIVE PREVIEW · NO ACCOUNT NEEDED</span></div>
        <QuestPreview />
      </section>

      <footer className="site-footer mx-auto flex flex-wrap items-center justify-between gap-4"><a className="wordmark" href="#">✳ QuestGo.</a><p>Made for the world outside your screen.</p><span>Early chapter · UI preview</span></footer>
    </main>
  );
}

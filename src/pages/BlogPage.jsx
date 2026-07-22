import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks.js";
import {
  listBlogPosts,
  getBlogPostBySlug,
  shareBlogArticle,
  blogArticleUrl,
} from "../lib/blogPosts.js";
import { loadBlogComments, postBlogComment } from "../lib/blogComments.js";
import { copyText } from "../lib/lookShare.js";
import { track, EV } from "../lib/analytics.js";

function BlogThumb({ src, alt, style }) {
  if (!src) {
    return <div className="img blog-thumb" style={{ background: "var(--maroon)", ...style }} />;
  }
  return (
    <div className="blog-thumb" style={style}>
      <img src={src} alt={alt || ""} />
    </div>
  );
}

function StoryCard({ post, onOpen }) {
  return (
    <article className="blog-card" onClick={() => onOpen(post.slug)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(post.slug)}>
      <BlogThumb src={post.thumb} alt={post.title} />
      <div className="blog-card-meta">
        <div className="eyebrow">{post.trending ? "Trending" : post.category}</div>
        <h3 className="serif">{post.title}</h3>
        <p className="blog-excerpt">{post.excerpt}</p>
        <span className="blog-more">Read story →</span>
      </div>
    </article>
  );
}

export function BlogIndex({ go }) {
  const posts = listBlogPosts({ trendingFirst: true });
  const trending = posts.filter((p) => p.trending);
  const latest = posts;

  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">
          <a style={{ cursor: "pointer" }} onClick={() => go("home")}>
            Home
          </a>{" "}
          / Blog
        </div>
        <h1>Blog</h1>
        <p className="lead">
          Trending stories in fashion and creative economies — craft, markets, runway, and the people building them.
        </p>
      </div>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: "left", marginBottom: 18 }}>
            <div className="eyebrow">Now trending</div>
            <h2 className="serif" style={{ fontSize: 28 }}>
              Stories drawing people in
            </h2>
          </div>
          <div className="blog-grid">
            {trending.map((p) => (
              <StoryCard key={p.slug} post={p} onOpen={(slug) => go("article", { slug })} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: "left", marginBottom: 18 }}>
            <div className="eyebrow">Latest</div>
            <h2 className="serif" style={{ fontSize: 28 }}>
              All stories
            </h2>
          </div>
          <div className="blog-grid">
            {latest.map((p) => (
              <StoryCard key={`all-${p.slug}`} post={p} onOpen={(slug) => go("article", { slug })} />
            ))}
          </div>
          <div className="blog-explore-cta">
            <p className="serif">Ready to discover, engage and patronize?</p>
            <button type="button" className="btn" onClick={() => go("home")}>
              Explore MyYanga
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function BlogArticle({ slug, go }) {
  const { profile } = useAuth();
  const post = getBlogPostBySlug(slug);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [guest, setGuest] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!post) return;
    track(EV.PAGE_VIEW, { view: "article", slug: post.slug });
    loadBlogComments(post.slug).then(setComments);
  }, [post?.slug]);

  if (!post) {
    return (
      <div className="wrap page-head">
        <div className="crumbs">
          <a style={{ cursor: "pointer" }} onClick={() => go("blog")}>
            Blog
          </a>{" "}
          / Missing
        </div>
        <h1>Story not found</h1>
        <p className="lead">That article may have moved. Browse the latest on the blog.</p>
        <button type="button" className="btn" onClick={() => go("blog")}>
          Back to Blog
        </button>
      </div>
    );
  }

  const share = async () => {
    const result = await shareBlogArticle(post);
    if (result.method === "native" && result.ok) {
      window.__toast?.("Shared");
      return;
    }
    if (result.method === "cancelled") return;
    const url = result.url || blogArticleUrl(post.slug);
    const ok = await copyText(url);
    window.__toast?.(ok ? "Link copied — share anywhere" : url);
  };

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await postBlogComment(post.slug, {
        body,
        guest_name: guest,
        user_id: profile?.id || null,
      });
      setBody("");
      setComments(await loadBlogComments(post.slug));
      window.__toast?.("Comment posted");
    } catch (e) {
      setErr(e.message || "Could not post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="wrap page-head" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="crumbs">
          <a style={{ cursor: "pointer" }} onClick={() => go("home")}>
            Home
          </a>{" "}
          /{" "}
          <a style={{ cursor: "pointer" }} onClick={() => go("blog")}>
            Blog
          </a>{" "}
          / Story
        </div>
        <div className="eyebrow">{post.trending ? "Trending · " : ""}{post.category}</div>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>{post.title}</h1>
        <p className="lead" style={{ marginBottom: 8 }}>
          {post.excerpt}
        </p>
        <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
          {post.author} · {new Date(post.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </p>
      </div>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <BlogThumb src={post.thumb} alt={post.title} style={{ aspectRatio: "16/10", marginBottom: 28 }} />
          <div className="blog-body">
            {post.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className="blog-actions">
            <button type="button" className="btn" onClick={share}>
              Share story
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => go("home")}>
              Explore MyYanga
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => go("blog")}>
              More stories
            </button>
          </div>

          <div className="panel blog-comments">
            <h3 className="serif" style={{ marginTop: 0, fontSize: 20 }}>
              Comments ({comments.length})
            </h3>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              Guest name is fine — leave a note and share the story to draw friends into MyYanga.
            </p>
            {comments.map((c) => (
              <div key={c.id} className="blog-comment">
                <div className="blog-comment-meta">
                  {c.guest_name || "Member"} · {new Date(c.created_at).toLocaleDateString()}
                </div>
                <div>{c.body}</div>
              </div>
            ))}
            {!comments.length && <p className="muted" style={{ fontSize: 13 }}>Be the first to comment.</p>}
            {!profile && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Your name</label>
                <input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Ada" />
              </div>
            )}
            <div className="field">
              <label>Comment</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ width: "100%", minHeight: 80, padding: 10, border: "1px solid var(--line)", fontFamily: "inherit" }}
                placeholder="What resonated with you?"
              />
            </div>
            {err && <p style={{ color: "#b00020", fontSize: 12 }}>{err}</p>}
            <button type="button" className="btn" disabled={busy || !body.trim()} onClick={submit}>
              {busy ? "Posting…" : "Post comment"}
            </button>
          </div>

          <div className="blog-explore-cta" style={{ marginTop: 36 }}>
            <p className="serif">The best of African fashion creativity, in one spot.</p>
            <button type="button" className="btn btn-gold" onClick={() => go("home")}>
              Explore MyYanga
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

/** Compact home / discover teaser rail */
export function BlogTeaser({ go, limit = 3, title = "Trending on the Blog", eyebrow = "Stories" }) {
  const posts = listBlogPosts({ trendingFirst: true }).slice(0, limit);
  return (
    <section className="section" style={{ background: "var(--cream)" }}>
      <div className="wrap">
        <div className="sec-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
          <div style={{ textAlign: "left" }}>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="serif" style={{ fontSize: 28, margin: "6px 0 0" }}>
              {title}
            </h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => go("blog")}>
            View Blog
          </button>
        </div>
        <div className="blog-grid" style={{ marginTop: 18 }}>
          {posts.map((p) => (
            <StoryCard key={p.slug} post={p} onOpen={(slug) => go("article", { slug })} />
          ))}
        </div>
      </div>
    </section>
  );
}

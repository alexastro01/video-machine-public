import { Img, staticFile } from "remotion";
import posts from "../../episodes/astra-born-yesterday/assets/posts.json";

type Post = (typeof posts)[number];
export const postById = new Map(posts.map((post) => [post.id, post]));

function Verified() {
  return (
    <svg width="35" height="35" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1d9bf0"
        d="m12 1.1 2.6 1.8 3.2-.1 1.3 2.9 2.6 1.8-.6 3.1.9 3-2.4 2.1-1 3.1-3.1.3-2.5 2-2.8-1.6-3.1.2L5.5 17l-2.8-1.6.4-3.2-1-3L4.4 7l.8-3.1 3.2-.5z"
      />
      <path
        fill="none"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m7.6 11.6 3 3 5.7-6"
      />
    </svg>
  );
}

function PostActions() {
  return (
    <div className="by-actions" aria-hidden="true">
      {[
        "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H11l-5 3v-5a8.5 8.5 0 1 1 15-6.5Z",
        "m2 8 4-4 4 4 M6 5v11a2 2 0 0 0 2 2h4 M22 16l-4 4-4-4 M18 19V8a2 2 0 0 0-2-2h-4",
        "M20.5 5.2a5.5 5.5 0 0 0-8.5 1 5.5 5.5 0 0 0-8.5-1C-1 10.7 6 16.8 12 21c6-4.2 13-10.3 8.5-15.8Z",
        "M6 3h12v18l-6-4-6 4z",
        "M12 16V3m-4.5 4.5L12 3l4.5 4.5M4 15v5h16v-5",
      ].map((d) => (
        <svg
          key={d}
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={d} />
        </svg>
      ))}
    </div>
  );
}

export function PostCard({
  post,
  flood = false,
}: {
  post: Post;
  flood?: boolean;
}) {
  const [before, emphasis, after] = post.parts;
  return (
    <article
      className={
        "by-post" +
        (flood ? " by-flood-post" : "") +
        (post.id === "prefer" ? " by-kind" : "")
      }
    >
      <header>
        <Img className="by-avatar" src={staticFile(post.avatar)} />
        <div className="by-account">
          <div className="by-name">
            {post.name}
            {post.verified && <Verified />}
          </div>
          <div className="by-handle">@{post.handle}</div>
        </div>
        <svg
          className="by-x"
          width="44"
          height="44"
          viewBox="0 0 24 24"
          aria-label="X"
        >
          <path
            fill="currentColor"
            d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.292 19.49h2.039L6.495 3.24H4.307l13.302 17.403Z"
          />
        </svg>
      </header>
      <div className="by-quote">
        {before}
        <strong>{emphasis}</strong>
        {after}
      </div>
      <div className="by-date">
        {new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(post.createdAt))}
      </div>
      <PostActions />
    </article>
  );
}

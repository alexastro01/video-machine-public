import projects from "../../channel/projects.json";

export { projects };
export type VideoProject = keyof typeof projects;
export const projectIds = Object.keys(projects) as VideoProject[];

export function isVideoProject(id: string): id is VideoProject {
  return Object.hasOwn(projects, id);
}

export function episodeProject(
  id: string,
  declared?: string,
): VideoProject | undefined {
  const legacy = projectIds.find((project) =>
    projects[project].legacyEpisodes.includes(id),
  );
  const prefix = projectIds
    .filter((project) => id.startsWith(project + "-"))
    .sort((a, b) => b.length - a.length)[0];
  const registered = legacy ?? prefix;
  if (declared === undefined) return registered;
  if (!isVideoProject(declared) || (registered && declared !== registered))
    throw new Error(
      `Episode ${id} has an invalid project assignment: ${declared}`,
    );
  return declared;
}

export function projectEpisodeId(id: string, project: VideoProject) {
  if (episodeProject(id) === project) return id;
  if (projectIds.some((other) => id.startsWith(other + "-")))
    throw new Error(`Episode ID ${id} belongs to another project`);
  const scoped = `${project}-${id}`;
  if (episodeProject(scoped) !== project)
    throw new Error(
      `Choose a distinct episode slug for ${projects[project].name}`,
    );
  return scoped;
}

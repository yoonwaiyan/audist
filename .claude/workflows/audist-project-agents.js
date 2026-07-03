export const meta = {
  name: 'audist-project-agents',
  description: 'One agent per Audist Linear project, each in its own worktree/branch, working its ready tickets in dependency order',
  phases: [
    { title: 'Discover', detail: 'Query Linear for ready tickets, grouped and ordered per project' },
    { title: 'Implement', detail: 'One worktree-isolated agent per project, sequential tickets inside it' },
  ],
}

const DISCOVERY_SCHEMA = {
  type: 'object',
  properties: {
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                url: { type: 'string' },
              },
              required: ['id', 'title'],
            },
          },
        },
        required: ['name', 'slug', 'issues'],
      },
    },
  },
  required: ['projects'],
}

phase('Discover')
const discovery = await agent(
  `Query Linear (mcp__claude_ai_Linear__* tools) for the Audist team (id 179b835c-921c-434b-ace2-7d1b01898d7d).

  Step 1 — call list_projects with team="Audist", includeArchived=false. Discard any project labeled "project-on-hold" entirely — none of its issues should appear in your output, regardless of their own labels. Only projects labeled "project-ready" (or otherwise not on-hold) are in scope.

  Step 2 — call list_issues with team="Audist", limit=250, includeArchived=false. Keep only issues that (a) belong to one of the in-scope projects from Step 1, (b) are labeled agent:ready AND (risk:low OR risk:medium) — risk:high is NEVER eligible regardless of agent:* label — excluding any still labeled agent:blocked or agent:needs-clarification, and (c) have status Backlog or Todo/Unstarted specifically — EXCLUDE anything already In Progress, In Review, Done, Completed, or Canceled. This is a recurring job: issues already In Review are mid-PR from a previous run and must not be picked up again.

  Group the remaining issues by their "project" field. Within each project, order issues so that any issue with a blockedBy relation to another issue in the same list comes after it (topological order) — call get_issue with includeRelations=true where an issue's description suggests a dependency and you're unsure of the order.

  Return the grouped, ordered result. "slug" should be a short kebab-case identifier derived from the project name (e.g. "Linux Release" -> "linux-release").`,
  { schema: DISCOVERY_SCHEMA, phase: 'Discover' },
)

log(`Found ${discovery.projects.length} projects with ready work: ${discovery.projects.map(p => `${p.name} (${p.issues.length})`).join(', ')}`)

phase('Implement')
const results = await parallel(
  discovery.projects.map(project => () =>
    agent(
      `You are the dedicated agent for the Audist Linear project "${project.name}". You are already inside a fresh, isolated git worktree checked out from main.

      Setup:
      1. Run "git ls-remote --heads origin agent/${project.slug}". If the branch already exists remotely (a previous run left work in progress on this project), fetch and check it out (git fetch origin agent/${project.slug} && git checkout agent/${project.slug}) instead of creating a new one — you're continuing that PR, not starting over. Otherwise create a fresh branch: git checkout -b agent/${project.slug}.
      2. If you checked out an existing branch, check whether a PR already exists for it (gh pr view agent/${project.slug}) before deciding whether to open a new one or push more commits to the existing PR at the end.

      Then work through these tickets IN ORDER, one at a time, all within this same worktree/branch — do not skip ahead or parallelize them yourself, they are ordered this way for a reason (either a real dependency or to avoid file conflicts within your own sequence of edits):

      ${project.issues.map((issue, i) => `${i + 1}. ${issue.id} — ${issue.title} (${issue.url})`).join('\n      ')}

      For each ticket:
      1. Call mcp__claude_ai_Linear__get_issue to read its full description and acceptance criteria.
      2. Implement the change. Run the project's typecheck/lint/tests before committing (see CLAUDE.md for commands).
      3. git commit with a message referencing the ticket id, e.g. "AUD-111: compile whisper.cpp on Ubuntu CI runner".
      4. The Audist Linear team has no "In Review" state — its states are Backlog, Todo, In Progress, Canceled, Done. Once you've committed the change and it's ready for human review via the PR, set the issue's status to "In Progress" via mcp__claude_ai_Linear__save_issue (this signals "actively being worked / awaiting merge", distinct from Backlog/Todo which the Discover phase treats as still up for grabs).
      5. If a ticket turns out to be unclear or riskier than expected once you're actually reading it, stop working on that ticket, relabel it agent:needs-clarification via save_issue, leave a comment explaining why via save_comment, and move on to the next ticket rather than guessing.

      When all tickets are done (or skipped with a reason), push the branch and open a single PR (gh pr create) covering all the commits, with a description listing every ticket id you completed and every one you skipped and why. Report back a short summary: tickets completed, tickets skipped, PR URL.`,
      { label: `project:${project.slug}`, phase: 'Implement', isolation: 'worktree' },
    ).then(report => ({ project: project.name, report })),
  ),
)

return results.filter(Boolean)

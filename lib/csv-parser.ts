/**
 * A memory-efficient, dependency-free CSV parser that handles quoted fields,
 * commas within quotes, and various newline characters without creating a full copy of the input string.
 * @param csvText The raw CSV string to parse.
 * @returns A 2D array of strings representing the parsed data.
 */
export function parseCsv(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotedField = false;

    function endOfField() {
        currentRow.push(currentField);
        currentField = "";
    }

    function endOfRow() {
        endOfField();
        rows.push(currentRow);
        currentRow = [];
    }

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];

        if (inQuotedField) {
            if (char === '"' && csvText[i + 1] === '"') {
                currentField += '"';
                i++; // Skip the next quote
            } else if (char === '"') {
                inQuotedField = false;
            } else {
                currentField += char;
            }
        } else {
            switch (char) {
                case '"':
                    inQuotedField = true;
                    break;
                case ',':
                    endOfField();
                    break;
                case '\n':
                    endOfRow();
                    break;
                case '\r':
                    // Ignore carriage return, but if it's followed by a newline, the newline case will handle it.
                    if (csvText[i + 1] === '\n') {
                        i++; // Skip the upcoming newline
                    }
                    endOfRow();
                    break;
                default:
                    currentField += char;
            }
        }
    }

    // Handle the last field and row if the file doesn't end with a newline
    if (currentField || currentRow.length > 0) {
        endOfRow();
    }
    
    // If the last line was empty, it might have added an empty row. Remove it.
    if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
        rows.pop();
    }

    return rows;
}


/**
 * Extracts workflows and their associated tests from parsed CSV data.
 * This function is designed to handle hierarchical CSV structures where a workflow
 * is defined in one row and its associated tests follow in subsequent rows.
 * It also supports optional filtering by group and priority with improved performance.
 */
export function extractWorkflows(
  csvData: string[][],
  workflowColumnIndex = 1,
  testColumnIndex = 2,
  priorityColumnIndex: number | null = null,
  selectedPriorities: string[] = [],
  groupColumnIndex: number | null = null,
  selectedGroups: string[] = [],
): Record<string, string[]> {
  const workflows: Record<string, string[]> = {};
  let currentWorkflow: string | null = null;
  let currentGroup: string | null = null;

  // Skip the header row for data processing
  const dataRows = csvData.slice(1);
  
  // Use Sets for efficient O(1) lookups, improving performance over array.includes()
  const selectedPrioritiesSet = new Set(selectedPriorities.map(p => p.toLowerCase()));
  const selectedGroupsSet = new Set(selectedGroups.map(g => g.toLowerCase()));
  const allPrioritiesSet = new Set(["high", "medium", "low"]);

  for (const row of dataRows) {
    // Extract potential group, workflow, and test from the current row
    const groupCandidate = groupColumnIndex !== null ? (row[groupColumnIndex]?.trim() ?? "") : "";
    const workflowCandidate = row[workflowColumnIndex]?.trim() ?? "";
    const testName = row[testColumnIndex]?.trim() ?? "";

    // If a new group is found, it becomes the current context for subsequent rows
    if (groupCandidate) {
        currentGroup = groupCandidate;
    }
    // If a new workflow is found, it becomes the current context for subsequent tests
    if (workflowCandidate) {
        currentWorkflow = workflowCandidate;
    }

    // A row is only processed if it contains a test name
    if (!testName) {
        continue;
    }

    let includeTest = true;

    // Filter by priority using the Set for efficiency
    if (includeTest && priorityColumnIndex !== null && selectedPrioritiesSet.size > 0) {
        const priorityLower = (row[priorityColumnIndex]?.trim() || "Unprioritised").toLowerCase();
        if (selectedPrioritiesSet.has("all")) {
            includeTest = allPrioritiesSet.has(priorityLower);
        } else {
            includeTest = selectedPrioritiesSet.has(priorityLower);
        }
    }

    // Filter by group using the Set for efficiency
    if (includeTest && groupColumnIndex !== null && selectedGroupsSet.size > 0) {
        const currentGroupLower = (currentGroup ?? "").toLowerCase();
        includeTest = selectedGroupsSet.has(currentGroupLower);
    }

    // If the test has not been filtered out, add it to the current workflow
    if (currentWorkflow && testName && includeTest) {
        if (!workflows[currentWorkflow]) {
            workflows[currentWorkflow] = [];
        }
        workflows[currentWorkflow].push(testName);
    }
  }

  return workflows;
}

/**
 * Extracts unique group names from the specified column in the CSV data.
 * @param csvData The parsed CSV data as a 2D array.
 * @param groupColumnIndex The index of the column containing group names.
 * @returns A sorted array of unique, non-empty group names.
 */
export function extractGroups(csvData: string[][], groupColumnIndex: number): string[] {
    if (!csvData[0] || groupColumnIndex >= csvData[0].length) {
        console.error("Group column index is out of bounds.");
        return [];
    }

    const dataRows = csvData.slice(1);

    const groupsInData = dataRows.map((row) => {
        return row[groupColumnIndex]?.trim() ?? "";
    });

    // Use a Set to get unique values and filter out any empty strings
    const uniqueGroups = Array.from(new Set(groupsInData)).filter(Boolean);

    return uniqueGroups.sort();
}


/**
 * Formats the extracted workflows and tests into a string for display.
 * @param workflows A record where keys are workflow names and values are arrays of test names.
 * @returns A formatted string with each workflow on a new line, followed by its tests prefixed with a hyphen.
 */
export function formatOutput(workflows: Record<string, string[]>): string {
  const outputLines: string[] = []

  for (const [workflow, tests] of Object.entries(workflows)) {
    // Only include workflows that have tests after filtering
    if (tests.length > 0) {
      outputLines.push(workflow)
      for (const test of tests) {
        outputLines.push(`-${test}`)
      }
    }
  }

  return outputLines.join("\n")
}

/**
 * Extracts unique priority values from the specified column in the CSV data.
 * This function specifically looks for "High", "Medium", "Low", and "Unprioritised".
 * @param csvData The parsed CSV data as a 2D array.
 * @param priorityColumnIndex The index of the column containing priority values.
 * @returns A sorted array of the unique priority values found in the data.
 */
export function extractPriorities(csvData: string[][], priorityColumnIndex: number): string[] {
  const standardPriorities = new Set(["High", "Medium", "Low", "Unprioritised"])

  const dataRows = csvData.slice(1)

  // Map all values in the priority column, defaulting empty or missing values to "Unprioritised"
  const prioritiesInData = dataRows.map((row) => {
    const priority = row[priorityColumnIndex]?.trim() ?? ""
    return priority === "" ? "Unprioritised" : priority
  })

  const uniquePrioritiesInData = Array.from(new Set(prioritiesInData))

  // Filter the found priorities to include only the standard ones
  const uniqueStandardPrioritiesFound = uniquePrioritiesInData.filter((p) => standardPriorities.has(p))

  // Sort the priorities in a logical order (High > Medium > Low)
  const priorityOrder: Record<string, number> = {
    High: 1,
    Medium: 2,
    Low: 3,
    Unprioritised: 4,
  }

  return uniqueStandardPrioritiesFound.sort((a, b) => {
    const orderA = priorityOrder[a] ?? 999
    const orderB = priorityOrder[b] ?? 999
    return orderA - orderB
  })
}
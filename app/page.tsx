"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { extractWorkflows, formatOutput, extractPriorities, extractGroups, parseCsv } from "@/lib/csv-parser"
// For more robust CSV parsing, you can use a library like Papaparse.
// To use it, uncomment the import below and the corresponding code in `handleFileUpload`.
// import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function Home() {
  const [result, setResult] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [workflowColumn, setWorkflowColumn] = useState<number>(1) // Default to column B
  const [testColumn, setTestColumn] = useState<number>(2) // Default to column C
  const [priorityColumn, setPriorityColumn] = useState<number | null>(null)
  const [availablePriorities, setAvailablePriorities] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const { toast } = useToast()

  const [groupColumn, setGroupColumn] = useState<number | null>(null)
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  // This effect runs when the selected priority column changes.
  // It extracts the available priorities from the data and resets the filter.
  useEffect(() => {
    if (csvData.length > 0 && priorityColumn !== null) {
      try {
        const priorities = extractPriorities(csvData, priorityColumn)
        setAvailablePriorities(priorities)
        setSelectedPriorities([]) // Reset selections when the column changes
      } catch (error) {
        console.error("Error extracting priorities:", error)
        toast({ title: "Error Extracting Priorities", description: String(error), variant: "destructive" })
        setAvailablePriorities([])
        setSelectedPriorities([])
      }
    } else {
      setAvailablePriorities([])
      setSelectedPriorities([])
    }
  }, [csvData, priorityColumn, toast])

  // This effect runs when the selected group column changes.
  // It extracts the available groups from the data and resets the filter.
  useEffect(() => {
    if (csvData.length > 0 && groupColumn !== null) {
      try {
        const groups = extractGroups(csvData, groupColumn)
        setAvailableGroups(groups)
        setSelectedGroups([]) // Reset selections when the column changes
      } catch (error) {
        console.error("Error extracting groups:", error)
        toast({ title: "Error Extracting Groups", description: String(error), variant: "destructive" })
        setAvailableGroups([])
        setSelectedGroups([])
      }
    } else {
      setAvailableGroups([])
      setSelectedGroups([])
    }
  }, [csvData, groupColumn, toast])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setResult("") // Clear previous results on new file upload

    try {
      const text = await file.text()
      
      // The dependency-free parser from `lib/csv-parser.ts` is used by default.
      const rows = parseCsv(text)

      // To use Papaparse for more complex CSVs, comment the line above and uncomment the one below.
      // const { data: rows } = Papa.parse<string[]>(text, { skipEmptyLines: true });

      if (rows.length < 2 || !rows[0]) {
         toast({ title: "Invalid CSV", description: "File needs at least a header and one data row.", variant: "destructive" });
         setHeaders([]);
         setCsvData([]);
         return;
      }

      const headerRow = rows[0]
      setHeaders(headerRow)
      setCsvData(rows)

      // Reset all filters and column selections to their default state
      setPriorityColumn(null)
      setAvailablePriorities([])
      setSelectedPriorities([])
      setGroupColumn(null)
      setAvailableGroups([])
      setSelectedGroups([])

      toast({
        title: "CSV Loaded Successfully",
        description: "Please select the columns and filters for parsing.",
      })
    } catch (error) {
      console.error("Error parsing CSV:", error)
      toast({ title: "Error Loading CSV", description: "There was a problem processing your file.", variant: "destructive" })
      // Clear state to prevent errors from inconsistent data
      setHeaders([]);
      setCsvData([]);
      setPriorityColumn(null);
      setGroupColumn(null);

    } finally {
      setIsLoading(false)
    }
  }

  const parseCSV = () => {
    if (csvData.length === 0) {
      toast({ title: "No CSV Data", description: "Please upload a CSV file first.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
  
      const workflows = extractWorkflows(
        csvData,
        workflowColumn,
        testColumn,
        priorityColumn,
        selectedPriorities,
        groupColumn,
        selectedGroups,
      )
      const formattedOutput = formatOutput(workflows)
      setResult(formattedOutput)

      if (formattedOutput) {
        toast({ title: "CSV Parsed Successfully", description: "The results are displayed below." })
      } else {
        toast({ title: "Parsing Complete", description: "No matching results were found based on your filters." , variant: "default"})
      }

    } catch (error) {
      console.error("Error parsing CSV:", error)
      toast({ title: "Error Parsing CSV", description: "There was a problem processing the data.", variant: "destructive" })
      setResult("") // Clear potentially incorrect results on error
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result)
    toast({ title: "Copied to clipboard!", description: "The parsed content has been copied." })
  }

  // Toggles all priorities. If all are selected, it deselects all. Otherwise, it selects all.
  const toggleAllPriorities = () => {
    if (selectedPriorities.length === availablePriorities.length) {
      setSelectedPriorities([])
    } else {
      setSelectedPriorities([...availablePriorities])
    }
  }

  // Toggles a single priority. If the priority is already selected, it's removed. Otherwise, it's added.
  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority],
    )
  }

  // Toggles all groups. If all are selected, it deselects all. Otherwise, it selects all.
  const toggleAllGroups = () => {
    if (selectedGroups.length === availableGroups.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups([...availableGroups])
    }
  }

  // Toggles a single group. If the group is already selected, it's removed. Otherwise, it's added.
  const toggleGroup = (group: string) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    )
  }

  return (
    <main className="min-h-screen bg-[#008080] p-4 md:p-8">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <Card className="win98-window border-[#c0c0c0] border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
          {/* Window Title Bar */}
          <div className="win98-title-bar bg-[#000080] text-white p-1 flex items-center justify-between">
             <div className="flex items-center">
              <span className="mr-2">📊</span>
              <h1 className="font-bold text-sm">Workflow and Test Extraction Tool</h1>
            </div>
            <div className="flex">
              <button className="win98-button w-5 h-5 flex items-center justify-center bg-[#c0c0c0] border border-white border-r-[#5a5a5a] border-b-[#5a5a5a] text-xs mr-1">
                _
              </button>
              <button className="win98-button w-5 h-5 flex items-center justify-center bg-[#c0c0c0] border border-white border-r-[#5a5a5a] border-b-[#5a5a5a] text-xs mr-1">
                □
              </button>
              <button className="win98-button w-5 h-5 flex items-center justify-center bg-[#c0c0c0] border border-white border-r-[#5a5a5a] border-b-[#5a5a5a] text-xs">
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#c0c0c0]">
            {/* File Upload Section */}
            <div className="win98-panel bg-[#c0c0c0] border-2 border-[#dfdfdf] border-r-[#808080] border-b-[#808080] p-4 mb-4">
              <h2 className="text-lg mb-4 font-bold font-['MS_Sans_Serif',sans-serif]">Upload CSV File</h2>
               <p className="mb-4 text-sm">
                Select a CSV file to parse workflows and tests according to the specified format.
              </p>

              <div className="win98-inset bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] p-2 mb-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full text-sm cursor-pointer"
                />
              </div>
            </div>

            {/* Column Selection and Filtering */}
            {headers.length > 0 && (
              <div className="win98-panel bg-[#c0c0c0] border-2 border-[#dfdfdf] border-r-[#808080] border-b-[#808080] p-4 mb-4">
                <h3 className="text-md mb-3 font-bold font-['MS_Sans_Serif',sans-serif]">Column Selection & Filters</h3>

                {/* Column Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Workflow Column */}
                  <div className="space-y-2">
                    <Label htmlFor="workflow-column" className="text-sm font-bold">Workflow Column:</Label>
                    <Select value={workflowColumn.toString()} onValueChange={(value) => setWorkflowColumn(Number.parseInt(value))}>
                      <SelectTrigger id="workflow-column" className="win98-dropdown bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf]">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => ( <SelectItem key={`wf-${index}`} value={index.toString()}>Col {String.fromCharCode(65 + index)} - {header}</SelectItem> ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Test Column */}
                  <div className="space-y-2">
                    <Label htmlFor="test-column" className="text-sm font-bold">Test Column:</Label>
                    <Select value={testColumn.toString()} onValueChange={(value) => setTestColumn(Number.parseInt(value))}>
                      <SelectTrigger id="test-column" className="win98-dropdown bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf]">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => ( <SelectItem key={`test-${index}`} value={index.toString()}>Col {String.fromCharCode(65 + index)} - {header}</SelectItem> ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Priority Column */}
                   <div className="space-y-2">
                      <Label htmlFor="priority-column" className="text-sm font-bold">Priority Column (Opt):</Label>
                      <Select
                        value={priorityColumn !== null ? priorityColumn.toString() : "-1"} // Use -1 to represent "None"
                        onValueChange={(value) => setPriorityColumn(value === "-1" ? null : Number.parseInt(value))}
                      >
                        <SelectTrigger id="priority-column" className="win98-dropdown bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf]">
                          <SelectValue placeholder="Select column (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">None</SelectItem>
                          {headers.map((header, index) => (
                            <SelectItem key={`pri-${index}`} value={index.toString()}>Col {String.fromCharCode(65 + index)} - {header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  {/* Group Column */}
                  <div className="space-y-2">
                    <Label htmlFor="group-column" className="text-sm font-bold">Group Column (Opt):</Label>
                    <Select
                      value={groupColumn !== null ? groupColumn.toString() : "-1"} // Use -1 to represent "None"
                      onValueChange={(value) => setGroupColumn(value === "-1" ? null : Number.parseInt(value))}
                    >
                      <SelectTrigger id="group-column" className="win98-dropdown bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf]">
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">None</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`grp-${index}`} value={index.toString()}>Col {String.fromCharCode(65 + index)} - {header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Priority Filters */}
                    {priorityColumn !== null && availablePriorities.length > 0 && (
                        <div className="mt-0">
                            <Label className="text-sm font-bold mb-2 block">Filter by Priority:</Label>
                            <div className="win98-inset bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] p-2">
                                <div className="flex items-center mb-2">
                                    <Checkbox
                                        id="all-priorities"
                                        checked={selectedPriorities.length === availablePriorities.length && availablePriorities.length > 0}
                                        onCheckedChange={toggleAllPriorities}
                                        className="win98-checkbox border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] bg-white"
                                    />
                                    <Label htmlFor="all-priorities" className="ml-2 text-sm">All Priorities</Label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {availablePriorities.map((priority) => (
                                    <div key={priority} className="flex items-center">
                                        <Checkbox
                                        id={`priority-${priority}`}
                                        checked={selectedPriorities.includes(priority)}
                                        onCheckedChange={() => togglePriority(priority)}
                                        className="win98-checkbox border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] bg-white"
                                        />
                                        <Label htmlFor={`priority-${priority}`} className="ml-2 text-sm">{priority}</Label>
                                    </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Group Filters */}
                    {groupColumn !== null && availableGroups.length > 0 && (
                        <div className="mt-0">
                            <Label className="text-sm font-bold mb-2 block">Filter by Group:</Label>
                            <div className="win98-inset bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] p-2">
                                <div className="flex items-center mb-2">
                                    <Checkbox
                                        id="all-groups"
                                        checked={selectedGroups.length === availableGroups.length && availableGroups.length > 0}
                                        onCheckedChange={toggleAllGroups}
                                        className="win98-checkbox border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] bg-white"
                                    />
                                    <Label htmlFor="all-groups" className="ml-2 text-sm">All Groups</Label>
                                </div>
                                {/* A scrollable container for potentially long lists of groups */}
                                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                                    {availableGroups.map((group) => (
                                        <div key={group} className="flex items-center">
                                            <Checkbox
                                                id={`group-${group}`}
                                                checked={selectedGroups.includes(group)}
                                                onCheckedChange={() => toggleGroup(group)}
                                                className="win98-checkbox border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] bg-white"
                                            />
                                            <Label htmlFor={`group-${group}`} className="ml-2 text-sm">{group}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                 </div>


                {/* Parse Button */}
                <div className="mt-6 text-center">
                    <Button
                        onClick={parseCSV}
                        disabled={isLoading}
                        className="win98-button bg-[#c0c0c0] border-2 border-[#dfdfdf] border-r-[#808080] border-b-[#808080] px-6 py-2 text-sm font-['MS_Sans_Serif',sans-serif] hover:bg-[#d0d0d0] text-black active:border-[#808080] active:border-r-[#dfdfdf] active:border-b-[#dfdfdf]"
                    >
                        {isLoading ? "Parsing..." : "Parse CSV"}
                    </Button>
                </div>

              </div>
            )}

            {/* Loading Indicator */}
             {isLoading && (
                <div className="flex items-center justify-center my-4 px-4">
                  <div className="win98-progress-bar w-full h-5 bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] overflow-hidden">
                    <div className="h-full bg-[#000080] animate-progress"></div>
                  </div>
                </div>
              )}

            {/* Results Section */}
            {result && !isLoading && (
              <div className="win98-panel bg-[#c0c0c0] border-2 border-[#dfdfdf] border-r-[#808080] border-b-[#808080] p-4">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-lg font-bold font-['MS_Sans_Serif',sans-serif]">Parsed Results</h2>
                  <Button
                    onClick={copyToClipboard}
                    className="win98-button bg-[#c0c0c0] border-2 border-[#dfdfdf] border-r-[#808080] text-black border-b-[#808080] px-4 py-1 text-sm font-['MS_Sans_Serif',sans-serif] hover:bg-[#d0d0d0] active:border-[#808080] active:border-r-[#dfdfdf] active:border-b-[#dfdfdf]"
                  >
                    Copy to Clipboard
                  </Button>
                </div>
                 <div className="win98-inset bg-white border-2 border-[#808080] border-r-[#dfdfdf] border-b-[#dfdfdf] p-2">
                  <Textarea
                    value={result}
                    readOnly
                    className="w-full h-64 font-mono text-sm bg-white border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="win98-statusbar bg-[#c0c0c0] border-t-2 border-[#dfdfdf] p-1 text-xs flex items-center justify-between">
            <span>Ready</span>
            <span className="text-xs">🔒 All processing happens locally in your browser</span>
          </div>
        </Card>
      </div>
    </main>
  )
}


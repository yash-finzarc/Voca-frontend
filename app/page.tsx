import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const callsData = [
  { time: "12:00", successful: 45, failed: 5 },
  { time: "13:00", successful: 52, failed: 3 },
  { time: "14:00", successful: 48, failed: 4 },
  { time: "15:00", successful: 61, failed: 2 },
  { time: "16:00", successful: 55, failed: 5 },
]

const durationData = [
  { time: "12:00", calls: 10, totalMinutes: 245 },
  { time: "13:00", calls: 15, totalMinutes: 380 },
  { time: "14:00", calls: 12, totalMinutes: 290 },
  { time: "15:00", calls: 18, totalMinutes: 450 },
  { time: "16:00", calls: 14, totalMinutes: 340 },
]

export const metadata = {
  title: "Dashboard - Voca AI Voice Assistant",
  description: "Overview of AI voice calls and analytics",
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your AI voice calls and analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">312</p>
            <p className="text-xs text-gray-500 mt-1">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">94.2%</p>
            <p className="text-xs text-gray-500 mt-1">↑ 2% improvement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1,705 min</p>
            <p className="text-xs text-gray-500 mt-1">≈ 28.4 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Call Success & Failures</CardTitle>
            <CardDescription>Successful vs failed calls over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                successful: { label: "Successful", color: "hsl(var(--chart-2))" },
                failed: { label: "Failed", color: "hsl(var(--chart-1))" },
              }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="successful" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="failed" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Volume & Duration</CardTitle>
            <CardDescription>Total calls and minutes by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                calls: { label: "Calls", color: "hsl(var(--chart-1))" },
                totalMinutes: { label: "Total Minutes", color: "hsl(var(--chart-2))" },
              }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="calls" stroke="hsl(var(--chart-1))" />
                  <Line yAxisId="right" type="monotone" dataKey="totalMinutes" stroke="hsl(var(--chart-2))" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

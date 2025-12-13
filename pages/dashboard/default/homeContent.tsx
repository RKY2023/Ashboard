import React from "react";

const INITIAL_REASON = [
  {
    title: "Energy Consumption",
    summary: "Monitor electricity meter readings and device usage patterns in real time."
  },
  {
    title: "Cooking Emissions",
    summary: "Track natural gas usage and kitchen ventilation performance."
  },
  {
    title: "Vehicle Emissions",
    summary: "Analyze distance traveled and fuel usage for eco-friendly driving."
  },
];

function HomeContentDefaultDashboard() {
  return (
    <section className="py-12 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Why Choose Ashboard?
        </h1>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {INITIAL_REASON.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 dark:border-gray-700 
                         bg-white dark:bg-slate-700 
                         p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomeContentDefaultDashboard;

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface FAQ {
  question: string
  answer: string
  category: string
}

const faqs: FAQ[] = [
  {
    question: "What is GeekCode Hackathon Platform?",
    answer:
      "GeekCode is a comprehensive platform designed to help developers participate in coding hackathons. It provides tools for hackathon registration, project submission, and collaboration with peers.",
    category: "general",
  },
  {
    question: "How do I join a hackathon?",
    answer:
      "To join a hackathon, create an account on GeekCode, browse available hackathons, and click the 'Apply Now' button on any open hackathon. You'll need to complete the application process which may include answering a few questions about your skills and interests.",
    category: "participation",
  },
  {
    question: "Can I participate in multiple hackathons simultaneously?",
    answer:
      "No, you can only be enrolled in one active hackathon at a time. This ensures participants can focus their efforts on a single challenge. Once your current hackathon ends or if you withdraw, you can join another one.",
    category: "participation",
  },
  {
    question: "How are hackathon submissions judged?",
    answer:
      "Submissions are evaluated based on innovation and creativity (25%), technical complexity (25%), design and user experience (20%), practicality and impact (20%), and presentation quality (10%). Each hackathon may have additional specific criteria.",
    category: "judging",
  },
  {
    question: "What should I include in my submission?",
    answer:
      "A complete submission should include your project code (via GitHub repository), a brief description of your solution, technologies used, challenges faced, and how your solution addresses the hackathon problem. You can also upload additional files like presentations or demos.",
    category: "submission",
  },
  {
    question: "Can I update my submission after submitting?",
    answer:
      "Yes, you can update your submission any time before the hackathon deadline. Simply go to your dashboard and edit your submission details or upload new files.",
    category: "submission",
  },
  {
    question: "How do I form a team?",
    answer:
      "Currently, GeekCode supports individual participation only. Team functionality will be added in a future update.",
    category: "participation",
  },
  {
    question: "What happens if I need to withdraw from a hackathon?",
    answer:
      "You can withdraw from a hackathon at any time through your dashboard. Keep in mind that if you withdraw, your spot becomes available to other participants, and you may not be able to rejoin if the hackathon reaches capacity.",
    category: "participation",
  },
  {
    question: "Are there prizes for winning hackathons?",
    answer:
      "Yes, most hackathons offer prizes for winners. The specific prizes vary by hackathon and are detailed on each hackathon's page.",
    category: "general",
  },
  {
    question: "How do I contact support?",
    answer:
      "For any issues or questions, please email support@geekcode.com or use the contact form in the Help section.",
    category: "general",
  },
]

export default function FAQsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const categories = Array.from(new Set(faqs.map((faq) => faq.category)))

  return (
    <div className="py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-400 mb-8">Find answers to common questions about GeekCode Hackathon Platform</p>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1A1A1A] border-gray-800"
          />
        </div>

        <Card className="bg-[#1A1A1A] border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>General Questions</CardTitle>
            <CardDescription>Basic information about GeekCode</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs
                .filter((faq) => faq.category === "general")
                .map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-gray-800">
                    <AccordionTrigger className="hover:text-[#00FFBF]">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-gray-300">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>Participation</CardTitle>
            <CardDescription>Questions about joining and participating in hackathons</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs
                .filter((faq) => faq.category === "participation")
                .map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-gray-800">
                    <AccordionTrigger className="hover:text-[#00FFBF]">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-gray-300">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>Submission & Judging</CardTitle>
            <CardDescription>Information about project submissions and evaluation</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs
                .filter((faq) => faq.category === "submission" || faq.category === "judging")
                .map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-gray-800">
                    <AccordionTrigger className="hover:text-[#00FFBF]">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-gray-300">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </CardContent>
        </Card>

        {searchQuery && (
          <div className="text-center text-gray-400 mt-4">
            {filteredFAQs.length === 0 ? (
              <p>No FAQs found matching "{searchQuery}"</p>
            ) : (
              <p>
                Found {filteredFAQs.length} results matching "{searchQuery}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


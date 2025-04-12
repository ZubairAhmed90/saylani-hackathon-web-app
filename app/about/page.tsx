import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mail, Github, Linkedin, Code, Users, Trophy, ArrowRight, Twitter } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="container py-6 md:py-8">
          <div className="flex flex-col space-y-8">
            {/* Hero Section */}
            <div className="flex flex-col space-y-4 text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">About GeekCode</h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Empowering developers to collaborate, innovate, and showcase their skills through hackathons.
              </p>
            </div>

            {/* Mission Section */}
            <section className="relative text-white body-font rounded-xl border hover:border-primary/50 overflow-hidden min-h-[600px]">
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <img src="/images1.jpeg" alt="Mission background" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/60"></div>
              </div>

              {/* Content Overlay */}
              <div className="container px-5 py-24 mx-auto relative z-10">
                <div className="text-center max-w-3xl mx-auto">
                  <div className="space-y-2 mb-8">
                    <h2 className="text-4xl font-bold text-primary">Our Mission</h2>
                    <p className="text-gray-300">What drives us at GeekCode</p>
                  </div>
                  <div className="space-y-6 text-lg">
                    <p>
                      At GeekCode, we believe in the power of collaboration and innovation. Our mission is to create a
                      platform where developers, designers, and tech enthusiasts can come together to solve problems,
                      learn new skills, and build amazing projects.
                    </p>
                    <p>
                      We aim to make hackathons accessible to everyone, regardless of their experience level or
                      background. By providing the tools and resources needed to organize and participate in hackathons,
                      we hope to foster a global community of creators who are passionate about using technology to make
                      a positive impact.
                    </p>
                    <p>
                      Our platform is designed to streamline the hackathon experience, from team formation to project
                      submission and judging, allowing participants to focus on what matters most: building great
                      solutions.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Team Section */}
            <div className="space-y-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Our Team</h2>
              <p className="text-muted-foreground">Meet the passionate individual behind GeekCode</p>

              {/* Single Dashing Card */}
              <Card className="max-w-4xl mx-auto overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_5px_rgba(0,255,170,0.5)] border-primary/30 hover:border-primary">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative overflow-hidden bg-gradient-to-br from-black to-gray-900 p-6 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,255,191,0.2),transparent_70%)]"></div>
                    <Avatar className="h-48 w-48 ring-4 ring-primary/50 shadow-[0_0_15px_rgba(0,255,191,0.5)]">
                      <AvatarImage src="public/1742109332487.jpg" alt="Zubair Ahmed" />
                      <AvatarFallback className="text-4xl bg-black">ZA</AvatarFallback>
                    </Avatar>
                  </div>

                  <CardContent className="p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-primary">Zubair Ahmed</h3>
                        <p className="text-lg text-muted-foreground">Developer</p>
                      </div>

                      <p>
                        Full-stack developer with a passion for building communities and fostering innovation. Leading
                        GeekCode's mission to transform how developers collaborate and showcase their skills.
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-primary" />
                          <span>1.5+ years of development experience</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span>Built multiple developer communities</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-primary" />
                          <span>Organized 20+ successful hackathons</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col space-y-4">
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full bg-transparent border-primary/50 hover:bg-primary/10 hover:text-primary"
                          asChild
                        >
                          <a href="https://github.com/ZubairAhmed90" aria-label="GitHub">
                            <Github className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full bg-transparent border-primary/50 hover:bg-primary/10 hover:text-primary"
                          asChild
                        >
                          <a href="https://www.linkedin.com/in/zubairahmed90/" aria-label="LinkedIn">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full bg-transparent border-primary/50 hover:bg-primary/10 hover:text-primary"
                          asChild
                        >
                          <a href="mailto:zubairahmedkaimkhani@gmail.com" aria-label="Email">
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>

                      <a href="https://www.linkedin.com/in/zubairahmed90/" target="_blank" rel="noopener noreferrer">
                        <Button className="bg-primary text-black hover:bg-primary/90 group">
                          Connect with Zubair
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>

            {/* Values Section */}
            <Card className="hover:shadow-md hover:border-primary/50">
              <CardHeader>
                <CardTitle>Our Values</CardTitle>
                <CardDescription>The principles that guide us</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Innovation</h3>
                    <p className="text-sm text-muted-foreground">
                      We believe in pushing boundaries and exploring new ideas to solve complex problems.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Collaboration</h3>
                    <p className="text-sm text-muted-foreground">
                      We foster an environment where diverse perspectives come together to create better solutions.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Inclusivity</h3>
                    <p className="text-sm text-muted-foreground">
                      We are committed to making tech events accessible to everyone, regardless of background or
                      experience.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Learning</h3>
                    <p className="text-sm text-muted-foreground">
                      We encourage continuous learning and skill development through hands-on experiences.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Impact</h3>
                    <p className="text-sm text-muted-foreground">
                      We aim to create technology that makes a positive difference in the world.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Community</h3>
                    <p className="text-sm text-muted-foreground">
                      We build strong, supportive communities where developers can connect and grow together.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Section */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
                <CardDescription>Get in touch with the GeekCode team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">General Inquiries</h3>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href="mailto:info@geekcode.com" className="text-primary hover:underline">
                        info@geekcode.com
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Support</h3>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href="mailto:support@geekcode.com" className="text-primary hover:underline">
                        support@geekcode.com
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Partnerships</h3>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href="mailto:partnerships@geekcode.com" className="text-primary hover:underline">
                        partnerships@geekcode.com
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className="font-bold">Careers</h3>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href="mailto:careers@geekcode.com" className="text-primary hover:underline">
                        careers@geekcode.com
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-center space-x-4">
                  <Button variant="outline" size="icon" asChild>
                    <a href="#" aria-label="Twitter">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href="#" aria-label="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href="#" aria-label="LinkedIn">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href="mailto:info@geekcode.com" aria-label="Email">
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

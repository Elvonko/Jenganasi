export type HelpAudience = "contractor" | "customer";

export type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string; steps?: string[] }[];
};

export type HelpCategory = {
  id: string;
  title: string;
  description: string;
  articles: HelpArticle[];
};

export type HelpFaq = { question: string; answer: string };

export type HelpContent = {
  eyebrow: string;
  title: string;
  intro: string;
  quickStart: { title: string; description: string; href?: string }[];
  categories: HelpCategory[];
  faqs: HelpFaq[];
  contact: { title: string; body: string };
};

const contractorContent: HelpContent = {
  eyebrow: "TEAM HELP CENTRE",
  title: "How to get the most from JengaNasi",
  intro:
    "Everything you need to run your construction projects, estimates, procurement and reporting — organised by what you are trying to do. Use the links below to jump straight to a task.",
  quickStart: [
    {
      title: "Set up your workspace",
      description:
        "Create your company profile, set your region and currency, and invite your team with the right roles.",
      href: "/settings",
    },
    {
      title: "Create your first project",
      description:
        "Add a customer, create a project, then build out phases, tasks and milestones.",
      href: "/projects/new",
    },
    {
      title: "Prepare an estimate",
      description:
        "Use a reusable template to build a bill of quantities with quantities and unit rates.",
      href: "/estimates/new",
    },
    {
      title: "Review your numbers",
      description:
        "Track progress, estimate values and recent activity in one place.",
      href: "/reports",
    },
  ],
  categories: [
    {
      id: "getting-started",
      title: "Getting started",
      description: "Your account, your company and the people in it.",
      articles: [
        {
          id: "account",
          title: "Your account and security",
          summary: "Verification, passwords and keeping your account safe.",
          sections: [
            {
              heading: "Verify your email",
              body:
                "After you sign up we send a verification link. Open it before signing in — until your email is verified, sign-in is blocked. Check your spam folder if the message does not arrive. In a development environment the link is printed to the server console instead.",
            },
            {
              heading: "Reset a forgotten password",
              body:
                "Choose “Forgot your password?” on the sign-in page and enter your email. We send a one-hour reset link. After setting a new password, all existing sessions are revoked, so you will need to sign in again on every device.",
            },
            {
              heading: "Keep your details current",
              body:
                "Use the company settings page to keep your organisation's name, region, currency and timezone accurate. These defaults affect how records are displayed across the workspace.",
            },
          ],
        },
        {
          id: "company",
          title: "Companies, memberships and roles",
          summary: "How workspaces and permissions work.",
          sections: [
            {
              heading: "Workspaces",
              body:
                "A company is an isolated workspace. Your data, projects and memberships belong to exactly one company, and records are never shared between workspaces. If you belong to more than one company, use the company switcher in the sidebar to change the active workspace.",
            },
            {
              heading: "Roles",
              body:
                "Every team member has a role that determines what they can see and change. Owners and admins can manage settings and billing. Project managers can run projects and estimates. Site supervisors can update project work, upload media and invite clients, while accountants review estimates and approve purchases. Procurement officers, storekeepers and sales representatives get only the permissions their work needs. Client accounts cannot access internal workspace pages at all — they use the client portal.",
            },
            {
              heading: "Least privilege",
              body:
                "Give each person the narrowest role that lets them do their job. Permissions are enforced on the server, so hiding a button in the interface never grants access.",
            },
          ],
        },
      ],
    },
    {
      id: "projects",
      title: "Projects and daily work",
      description: "Plan the build, track progress and keep a clear audit trail.",
      articles: [
        {
          id: "projects-basics",
          title: "Creating and organising projects",
          summary: "From a new project to phases, tasks and milestones.",
          sections: [
            {
              heading: "Create a project",
              body:
                "Go to Projects → New project. Give it a name and location, optionally link an active customer, and choose a template if you have one. Your plan sets how many active projects your company can have; archived projects do not count towards the limit.",
            },
            {
              heading: "Plan the work",
              body:
                "Open a project to add ordered phases, tasks and milestones. Tasks can be assigned to internal members and grouped into phases. Predecessor dependencies let you model a sequence — the app prevents cycles and self-dependencies. Milestones mark the moments that matter.",
            },
            {
              heading: "Track progress",
              body:
                "Update task and phase status as work happens. The project's progress percentage reflects completed work, and the overview and reports pages roll this up across your workspace. Every change is written to the audit log with the actor and time.",
            },
            {
              heading: "Templates",
              body:
                "Company templates store a reusable set of tasks and milestones. Owners and admins can create them under Settings; selecting one when creating a project copies its contents into the new project.",
            },
          ],
        },
        {
          id: "customers",
          title: "Customers",
          summary: "Keep client records current and linked to projects.",
          sections: [
            {
              heading: "Manage customer records",
              body:
                "The Customers page lists everyone your company works with. You can add, edit, deactivate and restore records. An email address is required if you want to invite that customer into the client portal.",
            },
            {
              heading: "Link customers to projects",
              body:
                "Choose an active customer when creating or editing a project. The link is validated on the server — you cannot attach a customer belonging to another company or one that has been deactivated.",
            },
          ],
        },
        {
          id: "media",
          title: "Progress photos, videos and files",
          summary: "Document the site and decide what clients can see.",
          sections: [
            {
              heading: "Upload an update",
              body:
                "On a project page, use the progress media form to upload an image, video or document with an optional caption. Images and documents are limited to 10 MB, videos to 20 MB. File type and contents are both checked before the upload is accepted.",
            },
            {
              heading: "Share with the client",
              body:
                "Tick “Share with client” when uploading, or edit an existing item's visibility. Only items marked as shared appear in that customer's portal. Everything else stays internal to your team.",
            },
            {
              heading: "Remove an update",
              body:
                "Deleting an item removes it for everyone, including the client portal. Because client visibility changes are audited, keep captions factual and avoid sharing sensitive internal documents.",
            },
          ],
        },
      ],
    },
    {
      id: "money",
      title: "Estimates, procurement, reports and billing",
      description: "The commercial side of running a build.",
      articles: [
        {
          id: "estimates",
          title: "Estimates and bills of quantities",
          summary: "Build, review and track quotes.",
          sections: [
            {
              heading: "Build an estimate",
              body:
                "Create an estimate against an active project and add line items with a category, description, unit, quantity and unit rate. The app calculates line totals and the estimate total. Reusable BOQ templates are managed in Settings and can seed a new estimate.",
            },
            {
              heading: "Status workflow",
              body:
                "Estimates move through draft, sent, approved and revision-requested states. Each status change is recorded so you can see who made the decision and when.",
            },
          ],
        },
        {
          id: "procurement",
          title: "Suppliers and purchase orders",
          summary: "Approve spending before it becomes a receipt.",
          sections: [
            {
              heading: "Set up suppliers",
              body:
                "Add suppliers under Procurement with their contact details and category. Only active suppliers can be used on purchase orders.",
            },
            {
              heading: "Purchase order approval",
              body:
                "Create a purchase order with a supplier, amount and optional project link. It starts as pending approval. A user with approval permission must approve it before it can be received — the workflow is enforced on the server, not just in the interface.",
            },
          ],
        },
        {
          id: "reports",
          title: "Reports",
          summary: "Understand progress and pipeline at a glance.",
          sections: [
            {
              heading: "What you can see",
              body:
                "Reports summarise project progress, task and milestone completion, estimate values by status and recent audit activity. All figures are scoped to the active company, so switching workspaces changes what you see.",
            },
          ],
        },
        {
          id: "billing",
          title: "Plans, M-Pesa payments and renewals",
          summary: "Manage your subscription and payment history.",
          sections: [
            {
              heading: "Choose a plan",
              body:
                "The Free plan includes one project. Pro allows ten and Business is unlimited, both billed annually. Owners and admins can open Billing to see the current plan, status and renewal date.",
            },
            {
              heading: "Pay with M-Pesa",
              body:
                "Enter your M-Pesa phone number and choose whether to auto-renew. You will receive an STK push — enter your PIN on your phone to complete the payment. Your plan upgrades automatically once the payment is verified and the amount matches the invoice. Unsuccessful or mismatched payments never change your plan.",
            },
            {
              heading: "Auto-renew",
              body:
                "Auto-renew records your consent and schedules an STK push before your plan expires. You can turn it off at any time from the Billing page. Every successful payment appears in your payment history with its M-Pesa receipt number.",
            },
          ],
        },
      ],
    },
  ],
  faqs: [
    {
      question: "I can't sign in after registering.",
      answer:
        "Open the verification link that was sent to your email. Verification is required before the first sign-in. If you cannot find it, check spam or request a fresh verification email from the sign-in screen.",
    },
    {
      question: "Why can't I create another project?",
      answer:
        "Your plan has an active-project limit. Archive a finished project or upgrade from the Billing page. Archived projects do not consume your allowance.",
    },
    {
      question: "Why can't I see a menu item a colleague has?",
      answer:
        "Navigation follows your role. Ask an owner or admin to confirm your role if you believe something is missing — permissions are enforced on the server, so the correct role is required.",
    },
    {
      question: "My client says a photo is missing.",
      answer:
        "Only media explicitly marked as shared is visible in the client portal. Open the project and check the item's sharing setting.",
    },
    {
      question: "I paid but my plan did not upgrade.",
      answer:
        "The payment must be completed on your phone and verified against the invoice amount. Check the payment history on the Billing page for the status and receipt; if it shows failed, start a new checkout.",
    },
  ],
  contact: {
    title: "Need more help?",
    body:
      "Check the answers above first. If you are still stuck, contact your company owner or administrator with the page you were on and what you were trying to do. Include any error message you saw so they can look it up.",
  },
};

const customerContent: HelpContent = {
  eyebrow: "CLIENT HELP CENTRE",
  title: "Welcome to your project portal",
  intro:
    "Your construction team uses JengaNasi to share project progress with you. This guide explains what you can see, how access works and what to do if something is missing.",
  quickStart: [
    {
      title: "Accept your invitation",
      description:
        "Open the invitation link from your contractor, sign in or create an account with the same email, then accept.",
      href: "/client-portal",
    },
    {
      title: "View your projects",
      description:
        "See the projects your contractor has shared with you and how far along each one is.",
      href: "/client-portal",
    },
    {
      title: "Review shared updates",
      description:
        "Open a project to see the photos, videos and documents your team chose to share.",
    },
  ],
  categories: [
    {
      id: "access",
      title: "Getting access",
      description: "Invitations, accounts and staying secure.",
      articles: [
        {
          id: "invitation",
          title: "How invitations work",
          summary: "What the link means and how to accept it.",
          sections: [
            {
              heading: "You receive an invitation",
              body:
                "Your contractor creates a secure invitation from the project page and sends you the link directly — it is not emailed automatically. The link is one-time, expires after seven days, and only works for the email address on your customer record. If it does not arrive, ask them to copy and share the link from the project's Client access panel. Never forward it to someone else.",
            },
            {
              heading: "Accept the invitation",
              body:
                "Open the link, sign in with an existing account or create one using the exact email the invitation was sent to, then confirm acceptance. The page will tell you if the email does not match — ask your contractor to send a new invitation to the correct address.",
            },
            {
              heading: "If the link has expired",
              body:
                "Expired or revoked links cannot be reused. Ask your contractor to issue a fresh invitation. You will still keep access to projects you were already invited to.",
            },
          ],
        },
        {
          id: "account-security",
          title: "Your account",
          summary: "Verification and password recovery.",
          sections: [
            {
              heading: "Verify your email",
              body:
                "A verification link is sent when you register. Open it before signing in. This confirms that the account really belongs to you and protects the invitation-bound email address.",
            },
            {
              heading: "Reset your password",
              body:
                "Use “Forgot your password?” on the sign-in page. The reset link is valid for one hour and signing in again will be required on all your devices afterwards.",
            },
          ],
        },
      ],
    },
    {
      id: "using-portal",
      title: "Using the client portal",
      description: "What you can see and what stays private.",
      articles: [
        {
          id: "projects",
          title: "Your projects",
          summary: "Status and progress at a glance.",
          sections: [
            {
              heading: "Project list",
              body:
                "The portal shows only projects your contractor has explicitly shared with you. Each card shows the company name, project status, location and a progress percentage, so you can see how the build is moving without contacting the site team.",
            },
            {
              heading: "Opening a project",
              body:
                "Select a project card to see its details and shared progress updates. If a project is missing, it has not been shared with your email address yet — ask your contractor to invite you.",
            },
          ],
        },
        {
          id: "shared-media",
          title: "Photos, videos and documents",
          summary: "How shared updates work.",
          sections: [
            {
              heading: "Only shared items appear",
              body:
                "Your contractor decides which site updates to share. Photos, videos and documents appear in your portal only when they are marked as shared. Internal notes and unshared files are never visible to you.",
            },
            {
              heading: "Downloading a file",
              body:
                "Open the project's progress section and choose the item you want. Images and videos can be viewed directly; other file types download to your device. Downloads are private to your account and are not cached publicly.",
            },
            {
              heading: "If something disappears",
              body:
                "Your contractor may have changed an item's sharing setting or removed it. Contact them if you need that update again.",
            },
          ],
        },
      ],
    },
    {
      id: "limits",
      title: "What you cannot do",
      description: "Clear boundaries, so there are no surprises.",
      articles: [
        {
          id: "read-only",
          title: "The portal is read-only",
          summary: "Your role is intentionally limited.",
          sections: [
            {
              heading: "Viewing only",
              body:
                "Client accounts can view their own projects and shared updates. You cannot edit project details, upload files, approve estimates, raise purchase orders or change company settings. Those actions belong to your contractor's internal team.",
            },
            {
              heading: "Privacy",
              body:
                "You can only see projects shared with your own email address. Other clients' projects and your contractor's internal records are never visible to you.",
            },
            {
              heading: "Access removal",
              body:
                "Your contractor can remove your access at any time. This does not delete the historical project records — it only stops you from viewing them.",
            },
          ],
        },
      ],
    },
  ],
  faqs: [
    {
      question: "The invitation link says it is invalid.",
      answer:
        "Invitation links expire after seven days and are single-use. Ask your contractor to send a fresh link to the exact email address you use for your account.",
    },
    {
      question: "I signed up but no projects appear.",
      answer:
        "Projects appear only after your contractor invites that email address and shares the project with you. Confirm the address with them.",
    },
    {
      question: "Why can I see a project but not its photos?",
      answer:
        "Photos and files are shared separately from the project itself. Ask your contractor to mark the relevant updates as shared with the client.",
    },
    {
      question: "Can I upload my own documents?",
      answer:
        "Not in the client portal. Send documents to your contractor directly; they can upload and share them through the project record if appropriate.",
    },
    {
      question: "How do I stop receiving access?",
      answer:
        "Ask your contractor to remove your client access, or sign out using the button in the portal header.",
    },
  ],
  contact: {
    title: "Need something specific?",
    body:
      "Your contractor is the right person to contact about project details, missing updates or access. If you are locked out of your account entirely, use the password-reset link on the sign-in page first.",
  },
};

export function getHelpContent(audience: HelpAudience): HelpContent {
  return audience === "customer" ? customerContent : contractorContent;
}

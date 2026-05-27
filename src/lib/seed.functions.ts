import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const companyNames = [
  "Summit Ridge Builders","Apex Energy Solutions","Horizon Contractors","GreenLeaf Architecture",
  "Pinnacle Homes","SolarWave Implementers","Metro Structural","Vista Custom Homes",
  "BlueSky Engineering","TerraFirma Builders","BrightCore Energy","Ironwood Contractors",
  "Skyline Design Group","Evergreen Builders","RedRock Construction","Coastal Energy Partners",
  "UrbanNest Developers","Wildflower Architecture","ClearWater Builders","Thunderbolt Contractors",
  "Pacific Energy Corp","Midland Homes","Alpine Construction","Sequoia Builders","Zenith Energy",
  "Canyon Ridge Homes","Delta Contractors","Maritime Engineering","Stellar Homes",
  "Fusion Energy Group","Boulder Builders","Riverstone Contractors","Aspire Architecture",
  "Titan Construction","Orchard Homes","Velocity Energy","Granite Peak Builders",
  "Willow Creek Homes","Copperfield Contractors","Nova Engineering","Sagebrush Builders",
  "Radiant Energy Co","Beacon Homes","IronForge Construction","Haven Architecture",
  "Zephyr Energy","Timberline Builders","Crestview Contractors","Echo Valley Homes",
  "Phoenix Energy","Riverside Builders","Sierra Contractors","Oasis Architecture",
  "Driftwood Homes","Peak Performance Energy","Meadowbrook Builders","Highland Contractors",
  "Sunburst Architecture","StormShield Construction","Aurora Energy","Cedar Ridge Homes",
  "Vanguard Contractors","Legacy Builders","TrueNorth Engineering","Catalyst Energy",
  "Brookside Homes","Prairie Wind Builders","Summit View Contractors","Horizon Line Energy",
  "Noble Construction","FoxRun Builders","Aspen Leaf Architecture","Pacific Rim Contractors",
  "Quartzite Homes","Boreal Energy","Sundance Builders","RidgeLine Contractors",
  "HarborView Engineering","Wildwood Homes","Crest Energy","Tamarack Builders"
];

const firstNames = ["James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","William","Elizabeth","David","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen","Christopher","Nancy","Daniel","Lisa","Matthew","Betty","Anthony","Margaret","Mark","Sandra","Donald","Ashley","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle","Kenneth","Dorothy","Kevin","Carol","Brian","Amanda","George","Melissa","Edward","Deborah"];
const lastNames = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts"];

const states = ["CA","TX","FL","NY","PA","IL","OH","GA","NC","MI","NJ","VA","WA","AZ","MA","TN","IN","MO","MD","WI","CO","MN","SC","AL","LA","KY","OR","OK","CT","UT","IA","NV","AR","MS","KS","NM","NE","WV","ID","HI","NH","ME","MT","RI","DE","SD","ND","VT","WY","AK"];
const cities: Record<string, string[]> = {
  CA:["Los Angeles","San Francisco","San Diego","Sacramento"],TX:["Houston","Dallas","Austin","San Antonio"],
  FL:["Miami","Tampa","Orlando","Jacksonville"],NY:["New York","Buffalo","Rochester","Albany"],
  PA:["Philadelphia","Pittsburgh","Harrisburg"],IL:["Chicago","Springfield","Peoria"],
  OH:["Columbus","Cleveland","Cincinnati"],GA:["Atlanta","Savannah","Augusta"],
  NC:["Charlotte","Raleigh","Durham"],MI:["Detroit","Grand Rapids","Lansing"],
  NJ:["Newark","Jersey City","Trenton"],VA:["Virginia Beach","Richmond","Norfolk"],
  WA:["Seattle","Spokane","Tacoma"],AZ:["Phoenix","Tucson","Scottsdale"],
  MA:["Boston","Cambridge","Springfield"],TN:["Nashville","Memphis","Knoxville"],
};

const industries = ["Builder","Contractor","Energy Implementer","Engineer/Architect","Partner/Other"];
const segmentsByIndustry: Record<string, string[]> = {
  Builder:["Production/Tract","Luxury Custom","Smart Home Champions","Affordable Housing","Mixed Use"],
  Contractor:["General","Electrical","HVAC","Plumbing","Roofing","Concrete"],
  "Energy Implementer":["Solar Residential","Solar Commercial","Battery Storage","EV Charging","Grid Services"],
  "Engineer/Architect":["Structural","MEP","Civil","Landscape","Sustainable Design"],
  "Partner/Other":["Supplier","Distributor","Consultant","Investor","Other"]
};
const revenueRanges = ["Under $1M","$1M - $5M","$5M - $10M","$10M - $50M","$50M+"];
const pricePoints = ["Budget","Mid-Market","Premium","Luxury"];
const financialHealths = ["Excellent","Good","Fair","Poor","Unknown"];
const contactTitles = ["CEO","VP Sales","Director of Operations","Project Manager","Purchasing Manager","Estimator","Field Supervisor","Owner","CFO","Business Development"];
const decisionAuthorities = ["Final","Influencer","Recommender","User","None"];
const opportunityNames = ["Q3 Solar Installation","Commercial HVAC Upgrade","Luxury Home Build","Mixed-Use Development","EV Charging Infrastructure","Roofing Replacement","Energy Audit","Smart Home Integration","Commercial Renovation","New Construction Bidding"];
const activitySubjects = ["Initial outreach","Follow-up call","Proposal review","Site visit","Contract negotiation","Demo scheduled","Pricing discussion","Timeline review","Introduction meeting","Contract signing"];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const seedDatabase = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ password: z.string() }).parse(input as Record<string, unknown>)
  )
  .handler(async ({ data }) => {
    if (data.password !== "seed-dhc-2024") {
      throw new Error("Invalid seed password");
    }

    const rand = rng(42);
    const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

    // 1. Create demo admin user
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: "demo@dylanharriscrm.com",
      password: "Demo1234!",
      email_confirm: true,
      user_metadata: { full_name: "Demo Admin" },
    });
    if (adminError && !adminError.message.includes("already been registered")) {
      throw adminError;
    }
    const adminId = adminUser?.user?.id;

    // 2. Create sales reps and manager
    const repEmails = [
      { email: "sarah@dylanharriscrm.com", name: "Sarah Chen", role: "sales_manager" },
      { email: "marcus@dylanharriscrm.com", name: "Marcus Johnson", role: "sales_rep" },
      { email: "elena@dylanharriscrm.com", name: "Elena Rodriguez", role: "sales_rep" },
      { email: "david@dylanharriscrm.com", name: "David Kim", role: "sales_rep" },
    ] as const;

    const userIds: string[] = [];
    if (adminId) userIds.push(adminId);

    for (const rep of repEmails) {
      const { data: u, error } = await supabaseAdmin.auth.admin.createUser({
        email: rep.email,
        password: "Demo1234!",
        email_confirm: true,
        user_metadata: { full_name: rep.name },
      });
      if (error && !error.message.includes("already been registered")) throw error;
      const uid = u?.user?.id;
      if (uid) userIds.push(uid);
    }

    // Ensure all users have profiles and roles
    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];
      const isAdmin = i === 0;
      const repIdx = i - 1;

      await supabaseAdmin.from("profiles").upsert({
        id: uid,
        full_name: isAdmin ? "Demo Admin" : repEmails[repIdx]?.name || "User",
        title: isAdmin ? "System Administrator" : (repEmails[repIdx]?.role === "sales_manager" ? "Sales Manager" : "Sales Representative"),
      }, { onConflict: "id" });

      const role = isAdmin ? "admin" : repEmails[repIdx]?.role || "sales_rep";
      const { data: existing } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", uid).eq("role", role).single();
      if (!existing) {
        await supabaseAdmin.from("user_roles").insert({ user_id: uid, role });
      }
    }

    // 3. Seed companies
    const companyRows: any[] = [];
    for (let i = 0; i < 75; i++) {
      const industry = pick(industries);
      const state = pick(states);
      const cityList = cities[state] || ["City"];
      companyRows.push({
        name: companyNames[i] || `Company ${i + 1}`,
        website: `https://www.${(companyNames[i] || `company${i}`).toLowerCase().replace(/\s+/g, "")}.com`,
        address: `${Math.floor(rand() * 9000) + 100} ${["Main","Broad","Market","Maple","Oak","Pine"][Math.floor(rand() * 6)]} St`,
        city: pick(cityList),
        state,
        zip: `${Math.floor(rand() * 90000) + 10000}`,
        region: ["CA","WA","OR","NV","AZ","HI","AK"].includes(state) ? "West" : "East",
        industry,
        segment: pick(segmentsByIndustry[industry] || ["Other"]),
        revenue_range: pick(revenueRanges),
        annual_volume: Math.floor(rand() * 500) + 10,
        price_point: pick(pricePoints),
        financial_health: pick(financialHealths),
        status: rand() > 0.7 ? "Active" : "Lead",
        created_by: pick(userIds),
        assigned_to_sales_rep_id: pick(userIds),
        notes: `Demo company ${i + 1}`,
      });
    }
    const { data: createdCompanies, error: companyErr } = await supabaseAdmin
      .from("companies")
      .insert(companyRows)
      .select("id, name");
    if (companyErr) throw companyErr;

    // 4. Seed contacts
    const contactRows: any[] = [];
    for (let i = 0; i < 200; i++) {
      const company = pick(createdCompanies || []);
      contactRows.push({
        company_id: company?.id,
        name: `${pick(firstNames)} ${pick(lastNames)}`,
        title: pick(contactTitles),
        email: `contact${i}@example.com`,
        phone: `(${Math.floor(rand() * 800) + 200}) ${Math.floor(rand() * 900) + 100}-${Math.floor(rand() * 9000) + 1000}`,
        mobile: rand() > 0.5 ? `(${Math.floor(rand() * 800) + 200}) ${Math.floor(rand() * 900) + 100}-${Math.floor(rand() * 9000) + 1000}` : null,
        linkedin_url: rand() > 0.3 ? `https://linkedin.com/in/${pick(firstNames).toLowerCase()}${pick(lastNames).toLowerCase()}` : null,
        decision_authority: pick(decisionAuthorities),
        is_primary: i % 3 === 0,
        created_by: pick(userIds),
        assigned_to_sales_rep_id: pick(userIds),
      });
    }
    const { data: createdContacts, error: contactErr } = await supabaseAdmin
      .from("contacts")
      .insert(contactRows)
      .select("id");
    if (contactErr) throw contactErr;

    // 5. Seed opportunities
    const oppRows: any[] = [];
    const stages = ["Open", "Proposal", "Committed", "Purchased", "Declined"];
    for (let i = 0; i < 50; i++) {
      const company = pick(createdCompanies || []);
      const contact = pick(createdContacts || []);
      const stage = pick(stages);
      oppRows.push({
        company_id: company?.id,
        contact_id: contact?.id,
        name: `${pick(opportunityNames)} ${i + 1}`,
        stage,
        expected_close_date: new Date(Date.now() + Math.floor(rand() * 90) * 86400000).toISOString().split("T")[0],
        estimated_value: Math.floor(rand() * 900000) + 50000,
        assigned_to: pick(userIds),
        assigned_to_sales_rep_id: pick(userIds),
        probability: stage === "Open" ? 20 : stage === "Proposal" ? 40 : stage === "Committed" ? 70 : stage === "Purchased" ? 100 : 0,
        created_by: pick(userIds),
      });
    }
    await supabaseAdmin.from("opportunities").insert(oppRows);

    // 6. Seed activities
    const actRows: any[] = [];
    const types = ["Call", "Email", "Meeting", "Demo", "Follow-up"];
    const outcomes = ["Scheduled", "Completed", "Cancelled"];
    for (let i = 0; i < 300; i++) {
      const company = pick(createdCompanies || []);
      const contact = pick(createdContacts || []);
      const type = pick(types);
      const outcome = pick(outcomes);
      const scheduled = new Date(Date.now() - Math.floor(rand() * 30) * 86400000);
      actRows.push({
        company_id: company?.id,
        contact_id: contact?.id,
        type,
        outcome,
        subject: pick(activitySubjects),
        description: `Demo activity ${i + 1}`,
        scheduled_at: scheduled.toISOString(),
        completed_at: outcome === "Completed" ? new Date(scheduled.getTime() + 3600000).toISOString() : null,
        assigned_to: pick(userIds),
        created_by: pick(userIds),
      });
    }
    await supabaseAdmin.from("activities").insert(actRows);

    // 7. Seed communications
    const commRows: any[] = [];
    for (let i = 0; i < 150; i++) {
      const company = pick(createdCompanies || []);
      const contact = pick(createdContacts || []);
      const type = i % 3 === 0 ? "Call" : "Email";
      const sentAt = new Date(Date.now() - Math.floor(rand() * 60) * 86400000);
      const opened = rand() > 0.3 ? new Date(sentAt.getTime() + Math.floor(rand() * 86400000)) : null;
      const replied = opened && rand() > 0.5 ? new Date(opened.getTime() + Math.floor(rand() * 172800000)) : null;
      const meeting = replied && rand() > 0.4 ? new Date(replied.getTime() + Math.floor(rand() * 172800000)) : null;
      commRows.push({
        company_id: company?.id,
        contact_id: contact?.id,
        type,
        subject: `Demo ${type.toLowerCase()} ${i + 1}`,
        body: `This is a demo communication record for testing purposes.`,
        sent_at: sentAt.toISOString(),
        opened_at: opened?.toISOString() || null,
        replied_at: replied?.toISOString() || null,
        meeting_scheduled_at: meeting?.toISOString() || null,
        engagement_score: meeting ? 100 : replied ? 75 : opened ? 50 : 25,
        created_by: pick(userIds),
      });
    }
    await supabaseAdmin.from("communications").insert(commRows);

    // 8. Seed job quotes
    const quoteRows: any[] = [];
    for (let i = 0; i < 40; i++) {
      const company = pick(createdCompanies || []);
      quoteRows.push({
        company_id: company?.id,
        quote_number: `Q-${2024}-${String(i + 1).padStart(4, "0")}`,
        title: `Quote for ${company?.name || "Client"}`,
        line_items: JSON.stringify([
          { name: "Product A", qty: Math.floor(rand() * 10) + 1, unit_price: Math.floor(rand() * 5000) + 500 },
          { name: "Product B", qty: Math.floor(rand() * 5) + 1, unit_price: Math.floor(rand() * 3000) + 300 },
        ]),
        total_amount: Math.floor(rand() * 100000) + 10000,
        status: pick(["Draft", "Sent", "Approved", "Declined"]),
        valid_until: new Date(Date.now() + Math.floor(rand() * 60) * 86400000).toISOString().split("T")[0],
        created_by: pick(userIds),
      });
    }
    await supabaseAdmin.from("job_quotes").insert(quoteRows);

    // 9. Seed building permits
    const permitRows: any[] = [];
    const projectTypes = ["Residential","Commercial","Industrial","Mixed-Use","Renovation"];
    for (let i = 0; i < 100; i++) {
      const state = pick(states);
      const cityList = cities[state] || ["City"];
      permitRows.push({
        permit_number: `BP-${2024}-${String(i + 1).padStart(5, "0")}`,
        jurisdiction: `${pick(cityList)} County`,
        state,
        region: ["CA","WA","OR","NV","AZ","HI","AK"].includes(state) ? "West" : "East",
        city: pick(cityList),
        address: `${Math.floor(rand() * 9000) + 100} ${["Main","Broad","Market","Maple"][Math.floor(rand() * 4)]} St`,
        project_type: pick(projectTypes),
        project_value: Math.floor(rand() * 5000000) + 100000,
        square_footage: Math.floor(rand() * 50000) + 1000,
        issue_date: new Date(Date.now() - Math.floor(rand() * 365) * 86400000).toISOString().split("T")[0],
        status: rand() > 0.2 ? "Active" : "Expired",
        contractor_name: pick(companyNames),
        lat: 37 + rand() * 10 - 5,
        lng: -122 + rand() * 50 - 25,
      });
    }
    await supabaseAdmin.from("building_permits").insert(permitRows);

    // 10. Seed presentations
    await supabaseAdmin.from("presentations").insert({
      title: "Demo Sales Deck",
      content: JSON.stringify([
        { type: "title", text: "Welcome to Dwayne Harris CRM" },
        { type: "bullet", text: "Track leads and opportunities" },
        { type: "bullet", text: "Manage communications" },
      ]),
      created_by: adminId || userIds[0],
    });

    return {
      success: true,
      usersCreated: userIds.length,
      companiesCreated: companyRows.length,
      contactsCreated: contactRows.length,
      opportunitiesCreated: oppRows.length,
      activitiesCreated: actRows.length,
      communicationsCreated: commRows.length,
      quotesCreated: quoteRows.length,
      permitsCreated: permitRows.length,
    };
  });

import test from "node:test";
import assert from "node:assert/strict";
import { classifyTopic } from "../content/topicClassifier.js";
import {
  generateBenefits,
  generateCTA,
  generateHero,
  generateProcess,
  generateTestimonials,
  generateFAQ
} from "../content/semanticGenerator.js";

test("classifyTopic assigns fitness and medical topic types with matching tones", () => {
  assert.deepEqual(classifyTopic("Gym Home Page", "home"), {
    topicType: "fitness",
    tone: ["energetic", "motivational"]
  });

  assert.deepEqual(classifyTopic("Dry Needling", "service"), {
    topicType: "medical",
    tone: ["professional", "trust-building"]
  });
});

test("semantic hero generation adapts tone to topic type", () => {
  const medicalHero = generateHero({
    topic: "Dry Needling",
    location: "Alexandria MN",
    pageType: "service",
    theme: "clinic"
  });

  const fitnessHero = generateHero({
    topic: "Gym Home Page",
    brand: "Workout 24/7",
    pageType: "home",
    theme: "gym"
  });

  assert.ok(medicalHero.headline.includes("Dry Needling Alexandria MN"));
  assert.ok(medicalHero.subtext.includes("trust quickly"));
  assert.equal(medicalHero.ctaText, "Book an Appointment");
  assert.ok(fitnessHero.headline.includes("Workout 24/7 Helps Members Start Strong"));
  assert.ok(fitnessHero.subtext.includes("high-energy"));
});

test("semantic section generators return structured content for downstream schemas", () => {
  const context = {
    topic: "HVAC Repair",
    location: "Plano TX",
    pageType: "location",
    theme: "local-service"
  };

  const benefits = generateBenefits(context);
  const process = generateProcess(context);
  const testimonials = generateTestimonials(context);
  const faq = generateFAQ(context);
  const cta = generateCTA(context);

  assert.equal(benefits.items.length, 3);
  assert.equal(process.steps.length, 3);
  assert.equal(testimonials.items.length, 3);
  assert.equal(faq.items.length, 3);
  assert.equal(cta.ctaText, "Contact the Local Team");
  assert.equal(cta.ctaLink, "#book-now");
});

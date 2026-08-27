import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

def main():
    output_dir = r'c:/Users/Zuhaib/OneDrive/Documents/3dweb/assets/sequence'
    os.makedirs(output_dir, exist_ok=True)

    base_path = r'c:/Users/Zuhaib/OneDrive/Documents/3dweb/assets/ferrari_clean.png'
    base_img = Image.open(base_path).convert('RGBA')
    W, H = base_img.size

    def extract_cutout(box, pad=4):
        x0, y0, x1, y1 = box
        w_b, h_b = x1 - x0, y1 - y0
        comp = Image.new('RGBA', (w_b, h_b), (0, 0, 0, 0))
        crop = base_img.crop((x0, y0, x1, y1))
        
        mask = Image.new('L', (w_b, h_b), 0)
        draw_m = ImageDraw.Draw(mask)
        draw_m.ellipse([pad, pad, w_b - pad, h_b - pad], fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(radius=3))
        
        comp.paste(crop, (0, 0), mask)
        return comp, (x0, y0)

    front_wing, fw_pos = extract_cutout((60, 230, 230, 370))
    engine_cover, ec_pos = extract_cutout((480, 165, 680, 275))
    halo, hl_pos = extract_cutout((370, 180, 510, 255))
    rear_wing, rw_pos = extract_cutout((705, 190, 800, 315))
    sidepod, sp_pos = extract_cutout((330, 250, 560, 360))
    front_wheel, fwh_pos = extract_cutout((185, 250, 310, 425))
    rear_wheel, rwh_pos = extract_cutout((740, 250, 800, 425))

    TOTAL_FRAMES = 90

    def ease_in_out(t):
        return t * t * (3 - 2 * t)

    print(f'Rendering {TOTAL_FRAMES} scrollytelling frames...')

    for frame_idx in range(TOTAL_FRAMES):
        progress = frame_idx / (TOTAL_FRAMES - 1)
        
        frame = Image.new('RGBA', (W, H), (5, 5, 5, 255))
        draw = ImageDraw.Draw(frame)

        # Ambient radial glow behind the car center
        glow_alpha = int(25 + 20 * math.sin(progress * math.pi))
        glow_radius = 280
        cx, cy = W // 2, H // 2 + 10
        for r in range(glow_radius, 40, -30):
            a = int(glow_alpha * (1 - r / glow_radius) * 0.4)
            draw.ellipse([cx - r, cy - int(r*0.6), cx + r, cy + int(r*0.6)], fill=(15, 18, 30, a))
            if progress > 0.4:
                draw.ellipse([cx - int(r*0.7), cy - int(r*0.4), cx + int(r*0.7), cy + int(r*0.4)], fill=(40, 5, 8, int(a * 0.7)))

        # PHASE 1: Frames 0 to 22 (Cinematic Scan & Lighting Reveal)
        if progress < 0.25:
            p1 = progress / 0.25
            e1 = ease_in_out(p1)
            
            car_alpha = min(1.0, 0.4 + e1 * 0.6)
            car_enhancer = ImageEnhance.Brightness(base_img)
            dimmed_car = car_enhancer.enhance(car_alpha)
            frame.paste(dimmed_car, (0, 0), dimmed_car)

            scan_x = int(e1 * (W + 100) - 50)
            if 0 <= scan_x < W:
                for lx in range(max(0, scan_x - 30), min(W, scan_x + 30)):
                    dist = abs(lx - scan_x)
                    line_a = int(180 * (1 - dist / 30))
                    draw.line([(lx, 100), (lx, 380)], fill=(0, 214, 255, line_a), width=1)
                
                draw.line([(scan_x, 80), (scan_x, 400)], fill=(200, 245, 255, 255), width=2)
                draw.line([(scan_x - 1, 90), (scan_x - 1, 390)], fill=(0, 214, 255, 200), width=1)
                draw.line([(scan_x + 1, 90), (scan_x + 1, 390)], fill=(0, 214, 255, 200), width=1)
                
                draw.ellipse([scan_x - 4, 220, scan_x + 4, 228], fill=(0, 214, 255, 255))
                draw.ellipse([scan_x - 8, 216, scan_x + 8, 232], outline=(0, 214, 255, 140), width=1)

        # PHASE 2: Frames 23 to 55 (Exploded CAD Technical Deconstruction)
        elif progress < 0.62:
            p2 = (progress - 0.25) / (0.62 - 0.25)
            if p2 < 0.7:
                exp_factor = ease_in_out(p2 / 0.7)
            else:
                exp_factor = 1.0 - 0.05 * math.sin((p2 - 0.7) / 0.3 * math.pi)

            core_enhancer = ImageEnhance.Brightness(base_img)
            core_car = core_enhancer.enhance(0.55)
            frame.paste(core_car, (0, 0), core_car)

            engine_x, engine_y = 510, 230
            glow_i = int(exp_factor * 200)
            draw.ellipse([engine_x - 40, engine_y - 20, engine_x + 80, engine_y + 40], fill=(225, 40, 10, int(glow_i * 0.4)))
            
            if exp_factor > 0.3:
                alpha_cad = int(exp_factor * 220)
                draw.rectangle([engine_x - 20, engine_y - 10, engine_x + 50, engine_y + 25], outline=(255, 200, 50, alpha_cad), width=1)
                draw.ellipse([engine_x + 35, engine_y - 18, engine_x + 65, engine_y + 12], outline=(0, 214, 255, alpha_cad), width=1)
                draw.line([(engine_x + 50, engine_y - 3), (engine_x + 50, engine_y + 25)], fill=(0, 214, 255, alpha_cad), width=1)
                draw.rectangle([engine_x - 35, engine_y + 5, engine_x - 15, engine_y + 25], outline=(0, 255, 180, alpha_cad), width=1)

            fw_ox = int(-35 * exp_factor)
            fw_oy = int(18 * exp_factor)
            frame.paste(front_wing, (fw_pos[0] + fw_ox, fw_pos[1] + fw_oy), front_wing)

            ec_ox = int(15 * exp_factor)
            ec_oy = int(-48 * exp_factor)
            frame.paste(engine_cover, (ec_pos[0] + ec_ox, ec_pos[1] + ec_oy), engine_cover)

            hl_ox = int(-5 * exp_factor)
            hl_oy = int(-26 * exp_factor)
            frame.paste(halo, (hl_pos[0] + hl_ox, hl_pos[1] + hl_oy), halo)

            rw_ox = int(22 * exp_factor)
            rw_oy = int(-32 * exp_factor)
            frame.paste(rear_wing, (rw_pos[0] + rw_ox, rw_pos[1] + rw_oy), rear_wing)

            sp_ox = int(-10 * exp_factor)
            sp_oy = int(24 * exp_factor)
            frame.paste(sidepod, (sp_pos[0] + sp_ox, sp_pos[1] + sp_oy), sidepod)

            fwh_ox = int(-12 * exp_factor)
            fwh_oy = int(10 * exp_factor)
            frame.paste(front_wheel, (fwh_pos[0] + fwh_ox, fwh_pos[1] + fwh_oy), front_wheel)

            rwh_ox = int(12 * exp_factor)
            rwh_oy = int(8 * exp_factor)
            frame.paste(rear_wheel, (rwh_pos[0] + rwh_ox, rwh_pos[1] + rwh_oy), rear_wheel)

            if exp_factor > 0.4:
                line_a = int(exp_factor * 160)
                draw.line([(ec_pos[0] + 80 + ec_ox, ec_pos[1] + 40 + ec_oy), (ec_pos[0] + 80, ec_pos[1] + 40)], fill=(0, 214, 255, line_a), width=1)
                draw.line([(fw_pos[0] + 70 + fw_ox, fw_pos[1] + 60 + fw_oy), (fw_pos[0] + 70, fw_pos[1] + 60)], fill=(0, 214, 255, line_a), width=1)
                draw.line([(hl_pos[0] + 60 + hl_ox, hl_pos[1] + 30 + hl_oy), (hl_pos[0] + 60, hl_pos[1] + 30)], fill=(225, 6, 0, line_a), width=1)
                draw.line([(rw_pos[0] + 40 + rw_ox, rw_pos[1] + 50 + rw_oy), (rw_pos[0] + 40, rw_pos[1] + 50)], fill=(0, 214, 255, line_a), width=1)

                for (lx, ly) in [(ec_pos[0] + 80 + ec_ox, ec_pos[1] + 40 + ec_oy),
                                 (fw_pos[0] + 70 + fw_ox, fw_pos[1] + 60 + fw_oy),
                                 (hl_pos[0] + 60 + hl_ox, hl_pos[1] + 30 + hl_oy),
                                 (rw_pos[0] + 40 + rw_ox, rw_pos[1] + 50 + rw_oy)]:
                    draw.ellipse([lx - 2, ly - 2, lx + 2, ly + 2], fill=(255, 255, 255, line_a))

        # PHASE 3: Frames 56 to 75 (Aerodynamic CFD Flow & Telemetry)
        elif progress < 0.82:
            p3 = (progress - 0.62) / (0.82 - 0.62)
            e3 = ease_in_out(p3)
            
            frame.paste(base_img, (0, 0), base_img)

            time_shift = p3 * 8.0
            num_streamlines = 14
            for s in range(num_streamlines):
                s_y_base = 160 + s * 16
                color_type = (0, 214, 255) if s % 2 == 0 else (225, 30, 20)
                alpha_stream = int(140 + 50 * math.sin(s + time_shift))
                
                points = []
                for x in range(30, 780, 25):
                    car_curve = 0
                    if 100 <= x <= 300:
                        car_curve = -18 * math.sin((x - 100) / 200 * math.pi)
                    elif 300 < x <= 500:
                        car_curve = -32 * math.sin((x - 300) / 200 * math.pi)
                    elif 500 < x <= 720:
                        car_curve = -20 * math.sin((x - 500) / 220 * math.pi)
                    elif x > 720:
                        car_curve = -38 * math.sin((x - 720) / 80 * math.pi)

                    wave = 4 * math.sin(x * 0.04 - time_shift * 3 + s)
                    y = s_y_base + car_curve + wave
                    points.append((x, int(y)))
                
                for pt_i in range(len(points) - 1):
                    p_start = points[pt_i]
                    p_end = points[pt_i + 1]
                    fade = min(1.0, (points[pt_i][0] - 30) / 100.0) * min(1.0, (780 - points[pt_i][0]) / 80.0)
                    seg_alpha = int(alpha_stream * max(0.0, fade))
                    draw.line([p_start, p_end], fill=(color_type[0], color_type[1], color_type[2], seg_alpha), width=2 if s%3==0 else 1)

            random.seed(frame_idx)
            for _ in range(25):
                px = random.randint(150, 750)
                py = random.randint(380, 420)
                p_len = random.randint(10, 30)
                draw.line([(px, py), (px + p_len, py)], fill=(0, 214, 255, 120), width=1)

        # PHASE 4: Frames 76 to 89 (Precision Reassembly & Race Trim)
        else:
            p4 = (progress - 0.82) / (1.0 - 0.82)
            e4 = ease_in_out(p4)

            frame.paste(base_img, (0, 0), base_img)

            brake_alpha = int(220 * min(1.0, e4 * 1.5))
            draw.ellipse([235, 320, 265, 350], fill=(255, 80, 10, brake_alpha))
            draw.ellipse([755, 320, 785, 350], fill=(255, 80, 10, brake_alpha))

            rain_led_a = int(200 + 55 * math.sin(p4 * 18.0))
            draw.ellipse([788, 300, 796, 308], fill=(255, 0, 0, rain_led_a))
            draw.ellipse([784, 296, 800, 312], outline=(255, 50, 50, int(rain_led_a * 0.5)), width=2)

            if p4 > 0.3:
                speed_p = (p4 - 0.3) / 0.7
                random.seed(frame_idx * 7)
                for _ in range(int(30 * speed_p)):
                    gx = random.randint(20, 700)
                    gy = random.randint(405, 440)
                    glen = random.randint(40, 120)
                    ga = int(140 * speed_p * random.random())
                    draw.line([(gx, gy), (gx + glen, gy)], fill=(225, 225, 235, ga), width=1)

            if 0.2 < p4 < 0.8:
                glint_p = (p4 - 0.2) / 0.6
                glint_x = int(150 + glint_p * 600)
                draw.line([(glint_x - 15, 230), (glint_x + 15, 230)], fill=(255, 255, 255, 240), width=2)
                draw.line([(glint_x, 215), (glint_x, 245)], fill=(255, 255, 255, 240), width=2)

        frame_rgb = frame.convert('RGB')
        filename = f'frame_{frame_idx:03d}.jpg'
        frame_rgb.save(os.path.join(output_dir, filename), 'JPEG', quality=90, optimize=True)

    print(f'Successfully generated {TOTAL_FRAMES} frames in {output_dir}')

if __name__ == '__main__':
    main()

#!/usr/bin/env python3.8

import json
import os


def span_wrap(text):
    return '<span class="text-muted">' + text + '</span>'


def link_wrap(text, href):
    return '<a href="' + href + '">' + text + "</a>"


def num_to_text(num):
    num_texts = [
        'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
        'ten', 'eleven'
    ]

    return num_texts[num]


def chal_page_name(name):
    return name.lower().replace(' ', '') + '.html'


def parse_json(year):
    with open(os.path.join('challenge_jsons', str(year) + '.json')) as f:
        challenges = json.loads(f.read())
    return challenges['challenges']


def generate_index(challenge_json, year):
    with open('templates/index.html') as f:
        index = f.read()
    index = index.replace('{year}', str(year))

    chal_tree = []
    count = 0
    for chal in challenge_json:
        chal_indiv_tree = []
        chal_name_line = link_wrap(chal['name'], chal_page_name(chal['name']))

        chal_cat_line = '│  ├── '
        chal_cat_line += chal['topics'][0]

        chal_pts_line = '│  └── points: '
        chal_pts_line += str(chal['points'])

        chal_indiv_tree.append('│')
        chal_indiv_tree.append(chal_name_line)
        chal_indiv_tree.append('│  │')
        chal_indiv_tree.append(chal_cat_line)
        chal_indiv_tree.append('│  │')
        chal_indiv_tree.append(chal_pts_line)

        chal_tree.append('\n'.join([span_wrap(x)
                                    for x in chal_indiv_tree]) + '\n')
        count += 1

    divider = '\n'.join([span_wrap(x) for x in '│' * 3]) + '\n'
    chals = divider.join(chal_tree)

    index = index.replace('{chals}', chals)

    return index


def clean_description(description):
    taboo_begins = ['<a href=', '<div class=chal-link>']
    taboo_ends = ['</a>', '</div>']
    for i in range(len(taboo_begins)):
        while taboo_begins[i] in description:
            taboo_begin = description.find(taboo_begins[i])
            taboo_end = description[taboo_begin:].find(taboo_ends[i])

            description = description[:taboo_begin] + description[
                taboo_begin + taboo_end + len(taboo_ends[i]):]

    description = description.strip()

    while (description[-4:] == "<br>"):
        description = description[:-4].strip()

    return description


def add_zip(description, name):
    zip_name = name.lower().replace(' ', '-') + '.zip'
    description += '<br><br><a href="data/' + zip_name + '">' + zip_name + "</a>"

    return description


def generate_chal_pages(challenge_json, year):
    chal_pages = {}

    with open('templates/chal.html') as f:
        template = f.read()

    count = 0
    for chal in challenge_json:
        chal_page = template
        chal_page = chal_page.replace('{num}', str(count + 1))
        chal_page = chal_page.replace('{year}', str(year))
        chal_page = chal_page.replace("{name}", chal['name'])
        chal_page = chal_page.replace('{topic}', chal['topics'][0])
        chal_page = chal_page.replace('{points}', str(chal['points']))
        chal_page = chal_page.replace(
            '{description}',
            add_zip(clean_description(chal['description']), chal['name']))

        chal_pages[chal_page_name(chal['name'])] = chal_page
        count += 1

    return chal_pages


def write_pages(index_page, chal_pages, year):
    base = '../' + str(year) + '/'
    with open(base + 'index.html', 'w+') as f:
        f.write(index_page)

    for chal_page, content in chal_pages.items():
        with open(base + chal_page, 'w+') as f:
            f.write(content)


if __name__ == '__main__':
    year = 2024

    challenge_json = parse_json(year)
    index_page = generate_index(challenge_json, year)
    chal_pages = generate_chal_pages(challenge_json, year)

    write_pages(index_page, chal_pages, year)
